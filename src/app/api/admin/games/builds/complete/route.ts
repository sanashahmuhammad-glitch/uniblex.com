import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/serverAdminAuth";
import { createUserSupabaseClient } from "@/lib/serverSupabase";
import { completeMultipartUpload, getR2Config, type CompletedPart } from "@/lib/r2Multipart";
import { areR2GameUploadsEnabled, r2GameUploadsUnavailableMessage } from "@/lib/r2GameUploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!areR2GameUploadsEnabled()) {
    return NextResponse.json({ error: r2GameUploadsUnavailableMessage }, { status: 503 });
  }

  const auth = await verifyAdminRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const authorization = request.headers.get("authorization") || "";
    const body = await request.json();
    const buildId = String(body.buildId ?? "");
    const gameId = String(body.gameId ?? "");
    const zipKey = String(body.zipKey ?? "");
    const uploadId = String(body.uploadId ?? "");
    const parts = normalizeParts(body.parts);

    if (!buildId || !gameId || !zipKey || !uploadId || !parts.length) {
      return NextResponse.json({ error: "Build id, game id, upload id, key, and uploaded parts are required." }, { status: 400 });
    }

    const supabase = createUserSupabaseClient(authorization);
    const config = getR2Config();
    await completeMultipartUpload(config, zipKey, uploadId, parts);

    const { data: build, error: buildError } = await supabase
      .from("game_builds")
      .update({ status: "uploaded" })
      .eq("id", buildId)
      .select("id,slug,version,r2_zip_key,r2_extract_prefix,index_url,size_bytes")
      .single();

    if (buildError || !build) {
      return NextResponse.json({ error: buildError?.message || "Unable to load completed build." }, { status: 400 });
    }

    await supabase.from("games").update({ build_status: "extracting", last_build_error: null }).eq("id", gameId);
    const extraction = await requestExtraction(build);

    if (!extraction.ok) {
      const error = extraction.error || "Worker extraction failed.";
      await supabase.from("game_builds").update({ status: "failed", error }).eq("id", buildId);
      await supabase.from("games").update({ build_status: "failed", last_build_error: error }).eq("id", gameId);
      return NextResponse.json({ error }, { status: 400 });
    }

    const manifest = extraction.manifest ?? {};
    const requiredAssets = extraction.requiredAssets ?? {};
    const indexUrl = String(extraction.indexUrl || build.index_url);

    await supabase.from("game_builds").update({
      status: "ready",
      index_url: indexUrl,
      file_count: Number(extraction.fileCount ?? 0),
      required_assets: requiredAssets,
      manifest,
      error: null,
      completed_at: new Date().toISOString()
    }).eq("id", buildId);

    const { error: gameError } = await supabase.from("games").update({
      build_id: buildId,
      build_status: "ready",
      build_version: build.version,
      r2_build_prefix: build.r2_extract_prefix,
      iframe_url: indexUrl,
      preview_url: indexUrl,
      build_metadata: manifest,
      last_build_error: null
    }).eq("id", gameId);

    if (gameError) {
      return NextResponse.json({ error: gameError.message }, { status: 400 });
    }

    return NextResponse.json({ buildId, gameId, indexUrl, manifest, requiredAssets });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to complete game build upload." },
      { status: 400 }
    );
  }
}

function normalizeParts(value: unknown): CompletedPart[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((part) => ({
      partNumber: Number(part?.partNumber),
      etag: String(part?.etag ?? "").trim()
    }))
    .filter((part) => Number.isInteger(part.partNumber) && part.partNumber > 0 && part.etag);
}

async function requestExtraction(build: Record<string, unknown>) {
  const workerUrl = process.env.R2_EXTRACT_WORKER_URL?.trim();
  const workerSecret = process.env.R2_EXTRACT_WORKER_SECRET?.trim();

  if (!workerUrl || !workerSecret) {
    return { ok: false, error: "R2 extraction worker is not configured." };
  }

  const response = await fetch(workerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${workerSecret}`
    },
    body: JSON.stringify({
      buildId: build.id,
      slug: build.slug,
      version: build.version,
      zipKey: build.r2_zip_key,
      extractPrefix: build.r2_extract_prefix,
      indexUrl: build.index_url
    })
  });
  const payload = await response.json().catch(() => ({}));

  return response.ok ? { ok: true, ...payload } : { ok: false, error: String(payload.error ?? "R2 extraction worker failed.") };
}
