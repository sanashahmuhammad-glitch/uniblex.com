import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/serverAdminAuth";
import { createUserSupabaseClient } from "@/lib/serverSupabase";
import { abortMultipartUpload, getR2Config } from "@/lib/r2Multipart";
import { areR2GameUploadsEnabled, r2GameUploadsUnavailableMessage } from "@/lib/r2GameUploads";
import { claimBuildOperation, finishBuildOperation, requireIdempotencyKey } from "@/lib/gameBuildState";
import { isMultipartUploadActive, readStoredMultipartIdentity, reconcileMultipartRequest, withMultipartUploadState } from "@/lib/r2UploadValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!areR2GameUploadsEnabled()) return NextResponse.json({ error: r2GameUploadsUnavailableMessage }, { status: 503 });
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized || !auth.user) return NextResponse.json({ error: auth.error }, { status: 401 });
  try {
    const authorization = request.headers.get("authorization") || "";
    const body = await request.json();
    const buildId = String(body.buildId ?? "");
    const idempotencyKey = requireIdempotencyKey(body.idempotencyKey);
    if (!buildId) return NextResponse.json({ error: "Build id is required." }, { status: 400 });
    const supabase = createUserSupabaseClient(authorization);
    const { data: build, error: buildError } = await supabase.from("game_builds")
      .select("id,game_id,created_by,status,r2_zip_key,size_bytes,manifest")
      .eq("id", buildId).eq("created_by", auth.user.id).maybeSingle();
    if (buildError || !build) return NextResponse.json({ error: "Build upload was not found." }, { status: 404 });
    const identity = readStoredMultipartIdentity(build);
    reconcileMultipartRequest(identity, { buildId, gameId: String(body.gameId ?? ""), zipKey: String(body.zipKey ?? ""), uploadId: String(body.uploadId ?? "") }, auth.user.id);
    const operation = await claimBuildOperation(supabase, { buildId, operation: "abort", idempotencyKey, targetState: "aborted" });
    if (operation.replayed) return NextResponse.json({ ok: operation.status === "succeeded", replayed: true, state: operation.state });
    if (!isMultipartUploadActive(build.status, identity)) return NextResponse.json({ error: "Multipart upload is not in an abortable state." }, { status: 409 });
    const reason = sanitizeAbortReason(body.error);
    try { await abortMultipartUpload(getR2Config(), identity.objectKey, identity.uploadId); }
    catch {
      await finishBuildOperation(supabase, operation.operation_id, "failed", "cleanup_pending", "MULTIPART_ABORT_FAILED");
      return NextResponse.json({ error: "Unable to clean up multipart upload." }, { status: 400 });
    }
    await supabase.from("game_builds").update({ error: reason, manifest: withMultipartUploadState(build.manifest, "aborted") }).eq("id", buildId);
    await finishBuildOperation(supabase, operation.operation_id, "succeeded", "aborted");
    await supabase.from("games").update({ build_status: "aborted", last_build_error: reason }).eq("id", identity.gameId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to abort game build upload." }, { status: 400 });
  }
}

function sanitizeAbortReason(value: unknown) {
  const reason = typeof value === "string" ? value.trim() : "";
  return reason ? reason.slice(0, 300) : "Upload was aborted.";
}
