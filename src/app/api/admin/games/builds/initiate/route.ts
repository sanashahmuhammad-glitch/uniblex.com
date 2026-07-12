import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/serverAdminAuth";
import { createUserSupabaseClient } from "@/lib/serverSupabase";
import { buildPublicIndexUrl, createBuildKeys, getR2Config, initiateMultipartUpload, presignR2Url } from "@/lib/r2Multipart";
import { slugify } from "@/lib/slug";
import { areR2GameUploadsEnabled, r2GameUploadsUnavailableMessage } from "@/lib/r2GameUploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const minPartSize = 8 * 1024 * 1024;
const maxZipSize = 2 * 1024 * 1024 * 1024;

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
    if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > maxZipSize) {
      return NextResponse.json({ error: "ZIP file size is invalid or exceeds the 2 GB limit." }, { status: 400 });
    }
    if (!Number.isInteger(partCount) || partCount < 1 || partCount > 10000) {
      return NextResponse.json({ error: "Multipart part count is invalid." }, { status: 400 });
    }

    const supabase = createUserSupabaseClient(authorization);
    const config = getR2Config();
    const version = await getNextBuildVersion(supabase, slug);
    const keys = createBuildKeys(slug, version);
    const uploadId = await initiateMultipartUpload(config, keys.zipKey);
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
      return NextResponse.json({ error: gameError?.message || "Unable to prepare game record." }, { status: 400 });
    }

    const { data: build, error: buildError } = await supabase.from("game_builds").insert({
      game_id: game.id,
      slug,
      version,
      status: "uploading",
      r2_zip_key: keys.zipKey,
      r2_extract_prefix: keys.extractPrefix,
      index_url: indexUrl,
      size_bytes: fileSize,
      created_by: auth.user.id,
      manifest: { fileName, partCount, clientUploadId: keys.uploadId }
    }).select("id").single();

    if (buildError || !build) {
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
      minPartSize,
      partUrls
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to initiate game build upload." },
      { status: 400 }
    );
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
