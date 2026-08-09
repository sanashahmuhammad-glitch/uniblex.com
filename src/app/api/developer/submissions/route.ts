import { NextResponse } from "next/server";
import { createUserSupabaseClient } from "@/lib/serverSupabase";
import { verifyDeveloperRequest } from "@/lib/serverDeveloperAuth";
import { slugify } from "@/lib/slug";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await verifyDeveloperRequest(request);
  if (!auth.authorized)
    return NextResponse.json({ error: auth.error }, { status: 401 });
  const db = createUserSupabaseClient(
    request.headers.get("authorization") || "",
  );
  const id = optionalUuid(new URL(request.url).searchParams.get("id"));
  if (id) {
    const { data, error } = await db
      .from("game_submissions")
      .select(
        "*,game_media(id,role,object_key,public_url,file_name,content_type,size_bytes,sha256,verified_at),developer_game_builds(id,operation_id,preview_url,build_type,compression_mode,file_count,total_bytes,verification_status,verified_at),submission_reviews(decision,developer_feedback,checklist,created_at)",
      )
      .eq("id", id)
      .eq("owner_id", auth.user.id)
      .maybeSingle();
    if (error)
      return NextResponse.json(
        { error: "Submission could not be loaded." },
        { status: 500 },
      );
    if (!data)
      return NextResponse.json(
        { error: "Submission was not found." },
        { status: 404 },
      );
    return NextResponse.json({
      submission: await withInheritedReleaseAssets(db, data),
    });
  }
  const [{ data, error }, { data: notifications }] = await Promise.all([
    db
      .from("game_submissions")
      .select(
        "id,title,slug,status,engine,updated_at,build_verified,short_description,game_id,parent_submission_id,revision_number,game_media(role,public_url),games(view_count,play_count,published_at),submission_reviews(decision,developer_feedback,created_at)",
      )
      .eq("owner_id", auth.user.id)
      .order("updated_at", { ascending: false })
      .limit(200),
    db
      .from("notifications")
      .select("id,kind,title,body,read_at,created_at")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  if (error)
    return NextResponse.json(
      { error: "Submissions could not be loaded." },
      { status: 500 },
    );
  const rows = data || [];
  const activeStatuses = new Set([
    "draft",
    "uploading",
    "upload_failed",
    "verification_pending",
    "verification_failed",
    "ready_for_review",
    "submitted",
    "under_review",
    "changes_requested",
    "approved",
  ]);
  const activeByGame = new Map(
    rows
      .filter(
        (row) =>
          row.parent_submission_id &&
          row.game_id &&
          activeStatuses.has(row.status),
      )
      .map((row) => [row.game_id, row.id]),
  );
  const byId = new Map(rows.map((row) => [row.id, row]));
  return NextResponse.json({
    submissions: rows.map((row) => ({
      ...row,
      cover_url: findInheritedCover(row, byId),
      active_update_id:
        row.status === "published" && row.game_id
          ? activeByGame.get(row.game_id) || null
          : null,
    })),
    notifications: notifications || [],
  });
}
export async function POST(request: Request) {
  const auth = await verifyDeveloperRequest(request);
  if (!auth.authorized)
    return NextResponse.json({ error: auth.error }, { status: 401 });
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const db = createUserSupabaseClient(
      request.headers.get("authorization") || "",
    );
    const { data: profile } = await db
      .from("developer_profiles")
      .select("id")
      .eq("id", auth.user.id)
      .maybeSingle();
    if (!profile) {
      const studio = String(
        auth.user.user_metadata?.studio_name ||
          auth.user.user_metadata?.display_name ||
          "",
      )
        .trim()
        .slice(0, 120);
      const { error: profileError } = await db
        .from("developer_profiles")
        .insert({
          id: auth.user.id,
          studio_name: studio,
          display_name: studio,
          account_status: "pending",
        });
      if (profileError)
        return NextResponse.json(
          {
            error:
              "Complete your developer profile before saving a submission.",
          },
          { status: 409 },
        );
    }
    if (body.action === "create_update") {
      const sourceId = uuid(body.id);
      const { data: source, error: sourceError } = await db
        .from("game_submissions")
        .select("*")
        .eq("id", sourceId)
        .eq("owner_id", auth.user.id)
        .maybeSingle();
      if (sourceError || !source)
        return NextResponse.json(
          { error: "Published submission was not found." },
          { status: 404 },
        );
      if (source.status !== "published" || !source.game_id)
        return NextResponse.json(
          { error: "Only a published game can start an update." },
          { status: 409 },
        );
      const activeStatuses = [
        "draft",
        "uploading",
        "upload_failed",
        "verification_pending",
        "verification_failed",
        "ready_for_review",
        "submitted",
        "under_review",
        "changes_requested",
        "approved",
      ];
      const { data: existing } = await db
        .from("game_submissions")
        .select("id,status")
        .eq("owner_id", auth.user.id)
        .eq("game_id", source.game_id)
        .neq("id", source.id)
        .in("status", activeStatuses)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing)
        return NextResponse.json({ submission: existing, reused: true });
      const { data: latest } = await db
        .from("game_submissions")
        .select("revision_number")
        .eq("owner_id", auth.user.id)
        .eq("slug", source.slug)
        .order("revision_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      const { data: revision, error: revisionError } = await db
        .from("game_submissions")
        .insert({
          owner_id: auth.user.id,
          game_id: source.game_id,
          parent_submission_id: source.id,
          revision_number: Number(latest?.revision_number || 1) + 1,
          title: source.title,
          slug: source.slug,
          short_description: source.short_description,
          full_description: source.full_description,
          category_id: source.category_id,
          tags: source.tags,
          engine: source.engine,
          primary_language: source.primary_language,
          age_rating: source.age_rating,
          content_declaration: source.content_declaration,
          options: source.options,
          gameplay_video_url: source.gameplay_video_url,
          status: "draft",
          build_verified: source.build_verified,
          submitted_at: null,
        })
        .select("id,status,revision_number,parent_submission_id")
        .single();
      return revisionError || !revision
        ? NextResponse.json(
            { error: "A game update could not be created." },
            { status: 409 },
          )
        : NextResponse.json({ submission: revision }, { status: 201 });
    }
    if (body.action === "archive") {
      const id = uuid(body.id);
      const { data, error } = await db
        .from("game_submissions")
        .update({ status: "archived" })
        .eq("id", id)
        .eq("owner_id", auth.user.id)
        .in("status", ["draft", "rejected", "changes_requested"])
        .select()
        .maybeSingle();
      return error || !data
        ? NextResponse.json(
            { error: "This submission cannot be archived." },
            { status: 409 },
          )
        : NextResponse.json({ submission: data });
    }
    const input =
      body.submission && typeof body.submission === "object"
        ? (body.submission as Record<string, unknown>)
        : body;
    const id = optionalUuid(input.id);
    const status = ["draft", "ready_for_review", "submitted"].includes(
      String(input.status),
    )
      ? String(input.status)
      : "draft";
    if (id) {
      const { data: current } = await db
        .from("game_submissions")
        .select("status")
        .eq("id", id)
        .eq("owner_id", auth.user.id)
        .maybeSingle();
      if (!current)
        return NextResponse.json(
          { error: "Submission was not found." },
          { status: 404 },
        );
      if (!["draft", "changes_requested", "rejected"].includes(current.status))
        return NextResponse.json(
          { error: "This reviewed submission is read-only." },
          { status: 409 },
        );
    }
    const payload = {
      owner_id: auth.user.id,
      title: text(input.title, 160),
      slug: slugify(String(input.slug || input.title || "")),
      short_description: text(input.short_description, 220),
      full_description: text(input.full_description, 5000),
      category_id: optionalUuid(input.category_id),
      tags: array(input.tags, 20),
      engine: text(input.engine, 80) || null,
      primary_language: text(input.primary_language, 80) || "English",
      age_rating: text(input.age_rating, 80) || null,
      content_declaration: object(input.content_declaration),
      options: object(input.options),
      gameplay_video_url: httpsUrl(input.gameplay_video_url),
      status,
      submitted_at: status === "submitted" ? new Date().toISOString() : null,
    };
    if (!payload.title || !payload.slug)
      return NextResponse.json(
        { error: "Game title and slug are required." },
        { status: 400 },
      );
    const query = id
      ? db
          .from("game_submissions")
          .update(payload)
          .eq("id", id)
          .eq("owner_id", auth.user.id)
      : db.from("game_submissions").insert(payload);
    const { data, error } = await query.select().single();
    if (error)
      return NextResponse.json(
        {
          error: error.message.includes("unique")
            ? "This studio already uses that slug."
            : "Submission could not be saved.",
        },
        { status: 409 },
      );
    return NextResponse.json({ submission: data }, { status: id ? 200 : 201 });
  } catch {
    return NextResponse.json(
      { error: "Submission request is invalid." },
      { status: 400 },
    );
  }
}
function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function object(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}
function array(value: unknown, max: number) {
  return (
    Array.isArray(value) ? value.map(String) : String(value || "").split(",")
  )
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, max);
}
function optionalUuid(value: unknown) {
  const input = String(value || "");
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    input,
  )
    ? input
    : null;
}
function uuid(value: unknown) {
  const result = optionalUuid(value);
  if (!result) throw new Error("Invalid ID");
  return result;
}
function httpsUrl(value: unknown) {
  const input = text(value, 1000);
  if (!input) return null;
  try {
    const parsed = new URL(input);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}
function findInheritedCover(submission: any, byId: Map<any, any>) {
  let current = submission;
  let depth = 0;
  while (current && depth < 50) {
    const cover = Array.isArray(current.game_media)
      ? current.game_media.find((media: any) => media.role === "cover")
          ?.public_url
      : null;
    if (cover) return cover;
    current = current.parent_submission_id
      ? byId.get(current.parent_submission_id)
      : null;
    depth += 1;
  }
  return null;
}

async function withInheritedReleaseAssets(
  db: ReturnType<typeof createUserSupabaseClient>,
  submission: any,
) {
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
    const { data: parent } = await db
      .from("game_submissions")
      .select(
        "parent_submission_id,game_media(id,role,object_key,public_url,file_name,content_type,size_bytes,sha256,verified_at),developer_game_builds(id,operation_id,preview_url,build_type,compression_mode,file_count,total_bytes,verification_status,verified_at)",
      )
      .eq("id", parentId)
      .eq("owner_id", submission.owner_id)
      .maybeSingle();
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
