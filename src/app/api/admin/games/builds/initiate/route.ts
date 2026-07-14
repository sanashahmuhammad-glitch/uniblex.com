import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/serverAdminAuth";
import { createUserSupabaseClient } from "@/lib/serverSupabase";
import { abortMultipartUpload, buildPublicIndexUrl, createBuildKeys, getR2Config, initiateMultipartUpload, presignR2Url } from "@/lib/r2Multipart";
import { slugify } from "@/lib/slug";
import { areR2GameUploadsEnabled, r2GameUploadsUnavailableMessage } from "@/lib/r2GameUploads";
import { createStoredMultipartIdentity, R2_MULTIPART_PART_SIZE, validateMultipartInitiation } from "@/lib/r2UploadValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!areR2GameUploadsEnabled()) {
    return NextResponse.json({ error: r2GameUploadsUnavailableMessage }, { status: 503 });
  }

  const auth = await verifyAdminRequest(request);
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const authorization = request.headers.get("authorization") || "";
    const body = await request.json();
    const slug = slugify(String(body.slug ?? ""));
    const title = String(body.title ?? "").trim();
    const gameId = String(body.gameId ?? "").trim();
    const fileName = String(body.fileName ?? "").trim();
    const fileSize = Number(body.fileSize ?? 0);
    const partCount = Number(body.partCount ?? 0);

    if (!slug || !title) return NextResponse.json({ error: "Title and slug are required." }, { status: 400 });
    if (!fileName.toLowerCase().endsWith(".zip")) return NextResponse.json({ error: "Upload must be a .zip file." }, { status: 400 });
    validateMultipartInitiation(fileSize, partCount);

    const supabase = createUserSupabaseClient(authorization);
    const config = getR2Config();
    const version = await getNextBuildVersion(supabase, slug);
    const keys = createBuildKeys(slug, version);
    const uploadId = await initiateMultipartUpload(config, keys.zipKey);
    const buildId = keys.uploadId;
    const indexUrl = buildPublicIndexUrl(config, keys.extractPrefix);

    const { data: game, error: gameError } = gameId
      ? await supabase.from("games").update({
          title,
          slug,
          build_status: "uploading",
          last_build_error: null
        }).eq("id", gameId).select("id").single()
      : await supabase.from("games").insert({
          title,
          slug,
          description: String(body.description ?? "Playable WebGL game."),
          status: "draft",
          build_status: "uploading"
        }).select("id").single();

    if (gameError || !game) {
      await abortCreatedUpload(config, keys.zipKey, uploadId);
      return NextResponse.json({ error: gameError?.message || "Unable to prepare game record." }, { status: 400 });
    }

    const { data: build, error: buildError } = await supabase.from("game_builds").insert({
      id: buildId,
      game_id: game.id,
      slug,
      version,
      status: "uploading",
      r2_zip_key: keys.zipKey,
      r2_extract_prefix: keys.extractPrefix,
      index_url: indexUrl,
      size_bytes: fileSize,
      created_by: auth.user.id,
      upload_id: uploadId,
      expected_size_bytes: fileSize,
      expected_part_count: partCount,
      idempotency_key: `initiate:${buildId}`,
      manifest: {
        fileName,
        multipartUpload: createStoredMultipartIdentity({
          buildId,
          gameId: game.id,
          ownerId: auth.user.id,
          uploadId,
          objectKey: keys.zipKey,
          expectedSize: fileSize,
          expectedPartCount: partCount
        })
      }
    }).select("id").single();

    if (buildError || !build) {
      await abortCreatedUpload(config, keys.zipKey, uploadId);
      return NextResponse.json({ error: buildError?.message || "Unable to create build record." }, { status: 400 });
    }

    const partUrls = Array.from({ length: partCount }, (_, index) => {
      const partNumber = index + 1;
      return {
        partNumber,
        url: presignR2Url(config, {
          method: "PUT",
          key: keys.zipKey,
          query: { partNumber: String(partNumber), uploadId },
          expires: 3600
        })
      };
    });

    return NextResponse.json({
      gameId: game.id,
      buildId: build.id,
      slug,
      version,
      uploadId,
      zipKey: keys.zipKey,
      extractPrefix: keys.extractPrefix,
      indexUrl,
      minPartSize: R2_MULTIPART_PART_SIZE,
      partUrls
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to initiate game build upload." },
      { status: 400 }
    );
  }
}

async function abortCreatedUpload(config: ReturnType<typeof getR2Config>, key: string, uploadId: string) {
  try {
    await abortMultipartUpload(config, key, uploadId);
  } catch {
    throw new Error("Unable to prepare build record and multipart cleanup failed.");
  }
}

async function getNextBuildVersion(supabase: ReturnType<typeof createUserSupabaseClient>, slug: string) {
  const { data, error } = await supabase
    .from("game_builds")
    .select("version")
    .eq("slug", slug)
    .order("version", { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);
  return Number(data?.[0]?.version ?? 0) + 1;
}
