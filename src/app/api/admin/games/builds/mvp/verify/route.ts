import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/serverAdminAuth";
import { createUserSupabaseClient } from "@/lib/serverSupabase";
import { createServiceSupabaseClient } from "@/lib/serverServiceSupabase";
import { areR2GameUploadsEnabled, r2GameUploadsUnavailableMessage } from "@/lib/r2GameUploads";
import { assertMvpOperationPrefix, getMvpHeadMismatch, getR2MvpConfig, headMvpObject, listMvpPrefix } from "@/lib/r2Mvp";
import { publicObjectUrl, WEBGL_MVP_LIMITS } from "@/lib/webglMvpManifest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!areR2GameUploadsEnabled()) return NextResponse.json({ error: r2GameUploadsUnavailableMessage }, { status: 503 });
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized || !auth.user) return NextResponse.json({ error: auth.error }, { status: 401 });
  try {
    const body = await request.json();
    const operationId = requireUuid(body.operationId);
    const cursor = Number(body.cursor ?? 0);
    if (!Number.isInteger(cursor) || cursor < 0) return NextResponse.json({ error: "Verification cursor is invalid." }, { status: 400 });
    const authorization = request.headers.get("authorization") || "";
    const userDb = createUserSupabaseClient(authorization);
    const serviceDb = createServiceSupabaseClient();
    const { data: operation, error } = await userDb.from("webgl_mvp_upload_operations")
      .select("id,build_id,game_id,owner_admin_id,state,staging_prefix,entry_path,file_count,total_bytes,build_type,compression_mode,public_entry_url")
      .eq("id",operationId).eq("owner_admin_id",auth.user.id).maybeSingle();
    if (error || !operation) return NextResponse.json({ error: "Upload operation was not found." }, { status: 404 });
    if (["ready_for_preview","previewed","published"].includes(operation.state)) {
      return NextResponse.json({ operationId, done: true, state: operation.state, nextCursor: Number(operation.file_count), previewUrl: operation.public_entry_url });
    }
    if (operation.state === "uploading") {
      const { error: beginError } = await serviceDb.rpc("webgl_mvp_begin_verification", { p_operation_id: operationId, p_owner_id: auth.user.id });
      if (beginError) return NextResponse.json({ error: "Unable to begin upload verification." }, { status: 409 });
    } else if (operation.state !== "verifying") {
      return NextResponse.json({ error: "Upload operation cannot be verified in its current state." }, { status: 409 });
    }
    const end = Math.min(cursor + WEBGL_MVP_LIMITS.verificationBatch, Number(operation.file_count));
    const { data: batch, error: batchError } = await userDb.from("webgl_mvp_upload_files")
      .select("path,object_key,size_bytes,sha256")
      .eq("operation_id",operationId).order("path").range(cursor,end - 1);
    if (batchError || !batch || (cursor < Number(operation.file_count) && !batch.length)) {
      return NextResponse.json({ error: "Authoritative upload manifest could not be read." }, { status: 500 });
    }
    const config = getR2MvpConfig();
    const prefix = assertMvpOperationPrefix(String(operation.staging_prefix),operationId);
    const checks = await Promise.all(batch.map(async (file) => {
      if (file.object_key !== `${prefix}${file.path}`) throw new Error("Upload object binding is invalid.");
      const object = await headMvpObject(config,file.object_key);
      return { file, object, mismatch: getMvpHeadMismatch({ size: Number(file.size_bytes), sha256: file.sha256 }, object) };
    }));
    const mismatch = checks.find((check) => check.mismatch);
    if (mismatch) {
      console.warn("webgl_mvp_head_mismatch", {
        operationId,
        path: mismatch.file.path,
        reason: mismatch.mismatch,
        status: mismatch.object.status,
        expectedSize: Number(mismatch.file.size_bytes),
        actualSize: mismatch.object.size,
        metadataPresent: Boolean(mismatch.object.sha256),
        checksumPresent: Boolean(mismatch.object.checksumSha256),
        headerNames: mismatch.object.headerNames
      });
      return NextResponse.json({ error: "Uploaded file failed verification: " + mismatch.file.path }, { status: 422 });
    }
    if (batch.length) {
      const { error: markError } = await serviceDb.rpc("webgl_mvp_mark_verified_files", {
        p_operation_id: operationId,p_owner_id: auth.user.id,p_paths: batch.map((file) => file.path)
      });
      if (markError) return NextResponse.json({ error: "Unable to record verified upload files." }, { status: 500 });
    }
    const nextCursor = end;
    if (nextCursor < Number(operation.file_count)) return NextResponse.json({ operationId,done:false,state:"verifying",nextCursor,verifiedFiles:nextCursor,totalFiles:operation.file_count });

    const allFiles = await readAllFiles(userDb,operationId,Number(operation.file_count));
    const expectedKeys = new Set(allFiles.map((file) => file.object_key));
    const actualKeys = await listMvpPrefix(config,prefix,Number(operation.file_count) + 1);
    if (actualKeys.length !== expectedKeys.size || actualKeys.some((key) => !expectedKeys.has(key))) {
      return NextResponse.json({ error: "Upload prefix contains missing or unexpected files." }, { status: 422 });
    }
    const publicEntryUrl = publicObjectUrl(config.publicBaseUrl,`${prefix}${operation.entry_path}`);
    const loaderConfig = {
      schemaVersion: 1,
      entryUrl: publicEntryUrl,
      totalBytes: Number(operation.total_bytes),
      buildType: operation.build_type,
      compressionMode: operation.compression_mode,
      files: allFiles.map((file) => ({
        path:file.path,url:publicObjectUrl(config.publicBaseUrl,file.object_key),size:Number(file.size_bytes),
        sha256:file.sha256,contentType:file.content_type,contentEncoding:file.content_encoding || undefined,
        cacheControl:file.cache_control
      }))
    };
    const { data: finalized, error: finalizeError } = await serviceDb.rpc("webgl_mvp_finish_verification", {
      p_operation_id:operationId,p_owner_id:auth.user.id,p_public_entry_url:publicEntryUrl,p_loader_config:loaderConfig
    });
    if (finalizeError || !finalized) return NextResponse.json({ error: "Unable to finalize verified upload." }, { status: 500 });
    return NextResponse.json({ ...finalized,done:true,nextCursor,totalFiles:operation.file_count });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to verify uploaded files." }, { status: 400 });
  }
}

async function readAllFiles(database: ReturnType<typeof createUserSupabaseClient>, operationId: string, expected: number) {
  const files: Array<Record<string,any>> = [];
  for (let start=0; start<expected; start+=1000) {
    const { data,error } = await database.from("webgl_mvp_upload_files")
      .select("path,object_key,size_bytes,sha256,content_type,content_encoding,cache_control")
      .eq("operation_id",operationId).order("path").range(start,Math.min(start+999,expected-1));
    if (error || !data) throw new Error("Unable to read the complete upload manifest.");
    files.push(...data);
  }
  if (files.length !== expected) throw new Error("Upload manifest file count changed during verification.");
  return files;
}
function requireUuid(value: unknown) {
  const text=String(value??"");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) throw new Error("Upload operation ID is invalid.");
  return text;
}
