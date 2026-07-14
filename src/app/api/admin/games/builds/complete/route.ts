import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/serverAdminAuth";
import { createUserSupabaseClient } from "@/lib/serverSupabase";
import { completeMultipartUpload, deleteR2Object, getR2Config, getR2ObjectSize } from "@/lib/r2Multipart";
import { areR2GameUploadsEnabled, r2GameUploadsUnavailableMessage } from "@/lib/r2GameUploads";
import { claimBuildOperation, finishBuildOperation, requireIdempotencyKey } from "@/lib/gameBuildState";
import { assertCompletedObjectSize, isMultipartUploadActive, normalizeCompletedParts, readStoredMultipartIdentity, reconcileMultipartRequest, withMultipartUploadState } from "@/lib/r2UploadValidation";

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
      .select("id,game_id,created_by,status,slug,version,r2_zip_key,r2_extract_prefix,index_url,size_bytes,manifest")
      .eq("id", buildId).eq("created_by", auth.user.id).maybeSingle();
    if (buildError || !build) return NextResponse.json({ error: "Build upload was not found." }, { status: 404 });
    const identity = readStoredMultipartIdentity(build);
    reconcileMultipartRequest(identity, { buildId, gameId: String(body.gameId ?? ""), zipKey: String(body.zipKey ?? ""), uploadId: String(body.uploadId ?? "") }, auth.user.id);
    const parts = normalizeCompletedParts(body.parts, identity.expectedPartCount);
    const completedManifest = withMultipartUploadState(build.manifest, "completed");
    const completionOperation = await claimBuildOperation(supabase, { buildId, operation: "complete", idempotencyKey, targetState: "uploaded" });
    if (completionOperation.replayed) return NextResponse.json({ ok: completionOperation.status === "succeeded", replayed: true, state: completionOperation.state });
    if (!isMultipartUploadActive(build.status, identity)) return NextResponse.json({ error: "Multipart upload is not in a completable state." }, { status: 409 });
    try {
      const config = getR2Config();
      await completeMultipartUpload(config, identity.objectKey, identity.uploadId, parts);
      const actualSize = await getR2ObjectSize(config, identity.objectKey);
      try { assertCompletedObjectSize(actualSize, identity.expectedSize); }
      catch { await deleteR2Object(config, identity.objectKey); throw new Error("Completed object size mismatch."); }
    } catch {
      await finishBuildOperation(supabase, completionOperation.operation_id, "failed", "failed", "MULTIPART_COMPLETION_FAILED");
      return NextResponse.json({ error: "Unable to complete multipart upload." }, { status: 400 });
    }
    await supabase.from("game_builds").update({ manifest: completedManifest, error: null }).eq("id", buildId);
    await finishBuildOperation(supabase, completionOperation.operation_id, "succeeded", "uploaded");

    const extractionOperation = await claimBuildOperation(supabase, { buildId, operation: "extract", idempotencyKey: `extract:${idempotencyKey}`, targetState: "extracting" });
    if (extractionOperation.replayed) return NextResponse.json({ ok: extractionOperation.status === "succeeded", replayed: true, state: extractionOperation.state });
    await supabase.from("games").update({ build_status: "extracting", last_build_error: null }).eq("id", identity.gameId);
    const extraction = await requestExtraction(build, extractionOperation.operation_id);
    if (!extraction.ok) {
      const error = extraction.error || "Worker extraction failed.";
      const failureState = extraction.cleanupFailed ? "cleanup_failed" : "failed";
      await finishBuildOperation(supabase, extractionOperation.operation_id, "failed", failureState, extraction.cleanupFailed ? "EXTRACTION_CLEANUP_FAILED" : "EXTRACTION_FAILED");
      await supabase.from("game_builds").update({ error }).eq("id", buildId);
      await supabase.from("games").update({ build_status: "failed", last_build_error: error }).eq("id", identity.gameId);
      return NextResponse.json({ error }, { status: 400 });
    }
    const extractionManifest = extraction.manifest ?? {};
    const requiredAssets = extraction.requiredAssets ?? {};
    const indexUrl = String(extraction.indexUrl || build.index_url);
    const manifest = { ...asRecord(completedManifest), extraction: extractionManifest };
    await supabase.from("game_builds").update({ index_url: indexUrl, file_count: Number(extraction.fileCount ?? 0), required_assets: requiredAssets, manifest, error: null, completed_at: new Date().toISOString() }).eq("id", buildId);
    await finishBuildOperation(supabase, extractionOperation.operation_id, "succeeded", "ready_for_preview");
    const { error: gameError } = await supabase.from("games").update({ build_id: buildId, build_status: "ready_for_preview", build_version: build.version, r2_build_prefix: build.r2_extract_prefix, iframe_url: indexUrl, preview_url: indexUrl, build_metadata: extractionManifest, last_build_error: null }).eq("id", identity.gameId);
    if (gameError) return NextResponse.json({ error: gameError.message }, { status: 400 });
    return NextResponse.json({ buildId, gameId: identity.gameId, indexUrl, manifest: extractionManifest, requiredAssets });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to complete game build upload." }, { status: 400 });
  }
}

async function requestExtraction(build: Record<string, unknown>, operationId: string) {
  const workerUrl = process.env.R2_EXTRACT_WORKER_URL?.trim();
  const workerSecret = process.env.R2_EXTRACT_WORKER_SECRET?.trim();
  if (!workerUrl || !workerSecret) return { ok: false, error: "R2 extraction worker is not configured.", cleanupFailed: false };
  const response = await fetch(workerUrl, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${workerSecret}` }, body: JSON.stringify({ buildId: build.id, slug: build.slug, version: build.version, zipKey: build.r2_zip_key, extractPrefix: build.r2_extract_prefix, operationId }) });
  const payload = await response.json().catch(() => ({}));
  return response.ok ? { ok: true, ...payload } : { ok: false, cleanupFailed: Boolean(payload.cleanupFailed), error: String(payload.error ?? "R2 extraction worker failed.") };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
