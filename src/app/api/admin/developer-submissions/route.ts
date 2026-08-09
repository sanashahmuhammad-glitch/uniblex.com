import { NextResponse } from "next/server";
import { createUserSupabaseClient } from "@/lib/serverSupabase";
import { createServiceSupabaseClient } from "@/lib/serverServiceSupabase";
import { verifyReviewerRequest } from "@/lib/serverDeveloperAuth";
import {
  getR2MvpConfig,
  getMvpHeadMismatch,
  replaceMvpObjectHostingMetadata,
  withNoTransform,
} from "@/lib/r2Mvp";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const decisions = new Set([
  "under_review",
  "changes_requested",
  "approved",
  "rejected",
  "published",
  "unpublished",
]);

export async function GET(request: Request) {
  const auth = await verifyReviewerRequest(request);
  if (!auth.authorized)
    return NextResponse.json({ error: auth.error }, { status: 401 });
  const db = createUserSupabaseClient(
    request.headers.get("authorization") || "",
  );
  const { data, error } = await db
    .from("game_submissions")
    .select(
      "*,developer_profiles!game_submissions_owner_id_fkey(studio_name,display_name,support_email),developer_game_builds(id,verification_status,preview_url,build_type,compression_mode,file_count,total_bytes,verified_at,manifest),game_media(role,public_url),submission_reviews(id,decision,developer_feedback,checklist,created_at,reviewer_id)",
    )
    .order("updated_at", { ascending: false })
    .limit(200);
  const byId = new Map(
    (data || []).map((submission: any) => [submission.id, submission]),
  );
  const hydrated = (data || []).map((submission: any) =>
    inheritReleaseAssets(submission, byId),
  );
  const repairs = hydrated
    .filter((submission: any) =>
      (submission.developer_game_builds || []).some(
        (build: any) =>
          build.verification_status === "verified" &&
          needsHostingRepair(build.manifest),
      ),
    )
    .map((submission: any) => submission.id);
  const submissions = hydrated.map((submission: any) => ({
    ...submission,
    developer_game_builds: (submission.developer_game_builds || []).map(
      ({ manifest: _, ...build }: any) => build,
    ),
  }));
  return error
    ? NextResponse.json(
        { error: "Developer review queue could not be loaded." },
        { status: 500 },
      )
    : NextResponse.json({
        submissions,
        role: auth.role,
        hostingRepairSubmissionIds: repairs,
      });
}
export async function POST(request: Request) {
  const auth = await verifyReviewerRequest(request);
  if (!auth.authorized)
    return NextResponse.json({ error: auth.error }, { status: 401 });
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const submissionId = uuid(body.submissionId);
    if (body.action === "repair_hosting") return repairHosting(submissionId);
    const decision = String(body.decision || "");
    if (!decisions.has(decision))
      return NextResponse.json(
        { error: "Review decision is invalid." },
        { status: 400 },
      );
    if (
      ["published", "unpublished"].includes(decision) &&
      !["owner", "admin"].includes(auth.role)
    )
      return NextResponse.json(
        { error: "Owner or admin authority is required to publish." },
        { status: 403 },
      );
    const developerFeedback =
      String(body.developerFeedback || "")
        .trim()
        .slice(0, 5000) || null;
    const internalNotes =
      String(body.internalNotes || "")
        .trim()
        .slice(0, 5000) || null;
    const checklist =
      body.checklist && typeof body.checklist === "object"
        ? body.checklist
        : {};
    if (
      ["changes_requested", "rejected"].includes(decision) &&
      !developerFeedback
    )
      return NextResponse.json(
        { error: "Developer-visible feedback is required for this decision." },
        { status: 400 },
      );
    const db = createUserSupabaseClient(
      request.headers.get("authorization") || "",
    );
    const { data, error } = await db.rpc("review_developer_submission", {
      p_submission_id: submissionId,
      p_decision: decision,
      p_developer_feedback: developerFeedback,
      p_internal_notes: internalNotes,
      p_checklist: checklist,
    });
    if (error) {
      const safe = String(error.message || "");
      const known = [
        "Reviewer access is required",
        "Owner or admin authority is required to publish",
        "Developer-visible feedback is required",
        "Submission was not found",
        "An unverified build cannot be approved or published",
        "Every QA checklist item must pass",
        "Approve the submission before publishing it",
        "Only a published submission can be unpublished",
        "A verified preview build is required",
        "Verified cover and thumbnail artwork are required",
        "The public game slug is already in use",
        "Linked public game was not found",
      ];
      const message = known.find((item) => safe.includes(item));
      return NextResponse.json(
        {
          error: message
            ? `${message}.`
            : "Review decision could not be recorded.",
        },
        {
          status:
            safe.includes("access") || safe.includes("authority") ? 403 : 409,
        },
      );
    }
    return NextResponse.json({ submission: data });
  } catch {
    return NextResponse.json(
      { error: "Review decision could not be recorded." },
      { status: 400 },
    );
  }
}
function inheritReleaseAssets(submission: any, byId: Map<any, any>) {
  const media = Array.isArray(submission.game_media)
    ? [...submission.game_media]
    : [];
  const builds = Array.isArray(submission.developer_game_builds)
    ? [...submission.developer_game_builds]
    : [];
  const roles = new Set(media.map((item: any) => item.role));
  let parentId = submission.parent_submission_id;
  let depth = 0;
  while (parentId && depth < 50) {
    const parent = byId.get(parentId);
    if (!parent) break;
    for (const item of Array.isArray(parent.game_media)
      ? parent.game_media
      : []) {
      if (!roles.has(item.role)) {
        media.push({ ...item, inherited: true });
        roles.add(item.role);
      }
    }
    for (const build of Array.isArray(parent.developer_game_builds)
      ? parent.developer_game_builds
      : [])
      builds.push({ ...build, inherited: true });
    parentId = parent.parent_submission_id;
    depth += 1;
  }
  return { ...submission, game_media: media, developer_game_builds: builds };
}
function uuid(value: unknown) {
  const input = String(value || "");
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      input,
    )
  )
    throw new Error("Invalid submission");
  return input;
}
function needsHostingRepair(manifest: unknown) {
  return (
    Array.isArray(manifest) &&
    manifest.some(
      (file: any) =>
        (file?.contentEncoding === "br" || file?.contentEncoding === "gzip") &&
        !String(file?.cacheControl || "")
          .toLowerCase()
          .split(",")
          .some((part: string) => part.trim() === "no-transform"),
    )
  );
}
async function repairHosting(submissionId: string) {
  const db = createServiceSupabaseClient();
  const { data: build, error } = await db
    .from("developer_game_builds")
    .select("id,owner_id,operation_id,manifest,verification_status")
    .eq("submission_id", submissionId)
    .eq("verification_status", "verified")
    .order("verified_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !build)
    return NextResponse.json(
      { error: "A verified preview build is required." },
      { status: 409 },
    );
  const files = Array.isArray(build.manifest)
    ? (build.manifest as Array<Record<string, unknown>>)
    : [];
  const compressed = files.filter(
    (file) => file.contentEncoding === "br" || file.contentEncoding === "gzip",
  );
  const prefix = `${process.env.VERCEL_ENV === "production" ? "developer-webgl-uploads" : "staging-developer-webgl-uploads"}/${build.owner_id}/${build.operation_id}/`;
  const config = getR2MvpConfig(process.env);
  for (const file of compressed) {
    const path = String(file.path || "");
    const key = String(file.objectKey || "");
    if (!path || key !== `${prefix}${path}`)
      return NextResponse.json(
        { error: "Build object ownership is invalid." },
        { status: 409 },
      );
    const result = await replaceMvpObjectHostingMetadata(config, key, {
      contentType: String(file.contentType || "application/octet-stream"),
      contentEncoding: file.contentEncoding as "br" | "gzip",
      cacheControl: withNoTransform(
        String(file.cacheControl || "public, max-age=31536000, immutable"),
      ),
    });
    const mismatch = getMvpHeadMismatch(
      { size: Number(file.size), sha256: String(file.sha256 || "") },
      result,
    );
    if (mismatch)
      throw new Error("WebGL object integrity changed during hosting repair.");
  }
  const updated = files.map((file) =>
    file.contentEncoding === "br" || file.contentEncoding === "gzip"
      ? {
          ...file,
          cacheControl: withNoTransform(
            String(file.cacheControl || "public, max-age=31536000, immutable"),
          ),
        }
      : file,
  );
  const { error: updateError } = await db
    .from("developer_game_builds")
    .update({ manifest: updated })
    .eq("id", build.id);
  if (updateError) throw updateError;
  return NextResponse.json({ repaired: compressed.length });
}
