import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/serverAdminAuth";
import { createUserSupabaseClient } from "@/lib/serverSupabase";
import { createServiceSupabaseClient } from "@/lib/serverServiceSupabase";
import { areR2GameUploadsEnabled, r2GameUploadsUnavailableMessage } from "@/lib/r2GameUploads";
import { assertMvpOperationPrefix, getR2MvpConfig, presignMvpPut, sha256HexToBase64 } from "@/lib/r2Mvp";
import { normalizeWebglPath, WEBGL_MVP_LIMITS } from "@/lib/webglMvpManifest";
import { authorizeSigningBatch } from "@/lib/webglMvpPolicy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!areR2GameUploadsEnabled()) return NextResponse.json({ error: r2GameUploadsUnavailableMessage }, { status: 503 });
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized || !auth.user) return NextResponse.json({ error: auth.error }, { status: 401 });
  try {
    const body = await request.json();
    const operationId = requireUuid(body.operationId);
    if (!Array.isArray(body.files) || !body.files.length || body.files.length > WEBGL_MVP_LIMITS.maxSigningBatch) {
      return NextResponse.json({ error: `Sign at most ${WEBGL_MVP_LIMITS.maxSigningBatch} files per batch.` }, { status: 400 });
    }
    const requested = body.files.map((file: Record<string, unknown>) => ({
      path: normalizeWebglPath(String(file.path ?? "")),
      size: Number(file.size),
      sha256: String(file.sha256 ?? "")
    }));
    if (new Set(requested.map((file: { path: string }) => file.path.toLocaleLowerCase("en-US"))).size !== requested.length) {
      return NextResponse.json({ error: "Signing batch contains duplicate paths." }, { status: 400 });
    }
    const supabase = createUserSupabaseClient(request.headers.get("authorization") || "");
    const { data: operation, error: operationError } = await supabase.from("webgl_mvp_upload_operations")
      .select("id,owner_admin_id,state,staging_prefix,expires_at")
      .eq("id",operationId).eq("owner_admin_id",auth.user.id).maybeSingle();
    if (operationError || !operation) return NextResponse.json({ error: "Upload operation was not found." }, { status: 404 });
    if (operation.state !== "uploading" || new Date(operation.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: "Upload operation is no longer accepting files." }, { status: 409 });
    }
    const prefix = assertMvpOperationPrefix(String(operation.staging_prefix), operationId);
    const { data: stored, error: filesError } = await supabase.from("webgl_mvp_upload_files")
      .select("path,object_key,size_bytes,sha256,content_type,content_encoding,cache_control")
      .eq("operation_id",operationId).in("path",requested.map((file: { path: string }) => file.path));
    if (filesError || !stored || stored.length !== requested.length) return NextResponse.json({ error: "Signing batch does not match this upload operation." }, { status: 409 });
    authorizeSigningBatch({
      id:operation.id,ownerId:operation.owner_admin_id,state:operation.state,
      stagingPrefix:operation.staging_prefix,expiresAt:new Date(operation.expires_at).getTime()
    },auth.user.id,requested,stored.map((file)=>({
      path:file.path,size:Number(file.size_bytes),sha256:file.sha256,objectKey:file.object_key
    })));
    const config = getR2MvpConfig();
    const expiresInSeconds = 60;
    const signingLeaseExpiresAt = new Date(Date.now() + (expiresInSeconds + 30) * 1000).toISOString();
    const serviceDb = createServiceSupabaseClient();
    const { error: leaseError } = await serviceDb.rpc("webgl_mvp_record_signing_lease", {
      p_operation_id: operationId,p_owner_id: auth.user.id,p_expires_at: signingLeaseExpiresAt
    });
    if (leaseError) return NextResponse.json({ error: "Upload operation is no longer accepting files." }, { status: 409 });
    const signed = requested.map((requestFile: { path: string; size: number; sha256: string }) => {
      const file = stored.find((candidate) => candidate.path === requestFile.path);
      if (!file || Number(file.size_bytes) !== requestFile.size || file.sha256 !== requestFile.sha256 || file.object_key !== `${prefix}${requestFile.path}`) {
        throw new Error("Signing batch does not match the authoritative manifest.");
      }
      const headers: Record<string,string> = {
        "content-type": file.content_type,
        "cache-control": file.cache_control,
        "x-amz-meta-sha256": file.sha256,
        "x-amz-checksum-sha256": sha256HexToBase64(file.sha256),
        "if-none-match": "*"
      };
      if (file.content_encoding) headers["content-encoding"] = file.content_encoding;
      return { path: file.path, url: presignMvpPut(config,file.object_key,headers,expiresInSeconds), headers };
    });
    return NextResponse.json({ operationId, expiresInSeconds, files: signed });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to sign upload files." }, { status: 400 });
  }
}

function requireUuid(value: unknown) {
  const text = String(value ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) throw new Error("Upload operation ID is invalid.");
  return text;
}
