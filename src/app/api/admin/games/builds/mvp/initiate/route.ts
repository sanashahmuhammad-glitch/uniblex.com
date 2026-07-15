import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/serverAdminAuth";
import { createUserSupabaseClient } from "@/lib/serverSupabase";
import { areR2GameUploadsEnabled, r2GameUploadsUnavailableMessage } from "@/lib/r2GameUploads";
import { stableManifestJson, validateWebglManifest } from "@/lib/webglMvpManifest";
import { slugify } from "@/lib/slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!areR2GameUploadsEnabled()) return NextResponse.json({ error: r2GameUploadsUnavailableMessage }, { status: 503 });
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized || !auth.user) return NextResponse.json({ error: auth.error }, { status: 401 });
  try {
    const idempotencyKey = request.headers.get("idempotency-key")?.trim() || "";
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/.test(idempotencyKey)) {
      return NextResponse.json({ error: "A valid upload request identity is required." }, { status: 400 });
    }
    const body = await request.json();
    const manifest = validateWebglManifest(body.manifest);
    const manifestJson = stableManifestJson(manifest);
    const manifestHash = createHash("sha256").update(manifestJson).digest("hex");
    if (body.manifestHash !== manifestHash) return NextResponse.json({ error: "Build manifest checksum does not match." }, { status: 400 });
    const slug = slugify(String(body.slug ?? ""));
    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const coverUrl = requireHttpsUrl(body.coverUrl, "Cover image");
    const thumbnailUrl = requireHttpsUrl(body.thumbnailUrl, "Thumbnail");
    const categoryId = optionalUuid(body.categoryId);
    if (!categoryId) throw new Error("Category is required for WebGL upload.");
    const genre = String(body.genre ?? "").trim();
    const screenshotUrls = stringArray(body.screenshotUrls, 12);
    const tags = stringArray(body.tags, 20);
    const desktopControls = jsonArray(body.desktopControls);
    const mobileControls = jsonArray(body.mobileControls);
    const requestHash = createHash("sha256").update(JSON.stringify({ slug,title,description,categoryId,genre,coverUrl,thumbnailUrl,screenshotUrls,tags,desktopControls,mobileControls,manifestHash })).digest("hex");
    const payload = {
      p_idempotency_key: idempotencyKey,
      p_request_hash: requestHash,
      p_slug: slug,
      p_title: title,
      p_description: description,
      p_category_id: categoryId,
      p_genre: genre,
      p_cover_url: coverUrl,
      p_thumbnail_url: thumbnailUrl,
      p_screenshot_urls: screenshotUrls,
      p_tags: tags,
      p_desktop_controls: desktopControls,
      p_mobile_controls: mobileControls,
      p_manifest_hash: manifestHash,
      p_build_type: manifest.buildType,
      p_compression_mode: manifest.compressionMode,
      p_file_count: manifest.files.length,
      p_total_bytes: manifest.totalBytes,
      p_manifest: manifest.files
    };
    const supabase = createUserSupabaseClient(request.headers.get("authorization") || "");
    const { data, error } = await supabase.rpc("create_webgl_mvp_upload_idempotent", payload);
    if (error || !data) return NextResponse.json({ error: mapCreateError(error?.message) }, { status: error?.message?.includes("slug") ? 409 : 400 });
    return NextResponse.json(data, { status: data.replayed ? 200 : 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to prepare WebGL upload." }, { status: 400 });
  }
}

function requireHttpsUrl(value: unknown, label: string) {
  const text = String(value ?? "").trim();
  try { const url = new URL(text); if (url.protocol === "https:") return url.toString(); } catch {}
  throw new Error(`${label} must be an HTTPS URL.`);
}
function optionalUuid(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) throw new Error("Category ID is invalid.");
  return text;
}
function stringArray(value: unknown, limit: number) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean).slice(0, limit);
}
function jsonArray(value: unknown) { return Array.isArray(value) ? value.slice(0, 30) : []; }
function mapCreateError(message = "") {
  if (message.includes("slug")) return "A game already uses this slug.";
  if (message.includes("idempotency")) return "This upload request conflicts with an earlier attempt.";
  if (message.includes("category")) return "The selected category is invalid.";
  return "Unable to create the authoritative upload operation.";
}
