import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/serverAdminAuth";
import { slugify } from "@/lib/slug";
import { createHash } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const title = String(formData.get("title") ?? "");
    const requestedSlug = String(formData.get("slug") ?? "");
    const slug = slugify(requestedSlug || title);
    const gameZip = formData.get("gameZip");
    const coverImage = formData.get("coverImage");
    const result: { slug: string; iframeUrl?: string; coverUrl?: string; messages: string[] } = {
      slug,
      messages: []
    };

    if (!slug) {
      return NextResponse.json({ error: "Enter a title or slug before uploading." }, { status: 400 });
    }

    if (gameZip instanceof File && gameZip.size > 0) {
      return NextResponse.json(
        { error: "WebGL ZIP files upload directly to Supabase Storage from the admin browser. Refresh the admin page and try again." },
        { status: 413 }
      );
    }

    if (coverImage instanceof File && coverImage.size > 0) {
      if (!coverImage.type.startsWith("image/")) {
        return NextResponse.json({ error: "Cover upload must be an image file." }, { status: 400 });
      }

      result.coverUrl = await uploadCoverToCloudinary(coverImage, slug);
      result.messages.push("Cover image uploaded to Cloudinary.");
    }

    if (!result.iframeUrl && !result.coverUrl) {
      result.messages.push("No files uploaded. Manual iframe_url and cover_url values will be used.");
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to process upload." },
      { status: 400 }
    );
  }
}

async function uploadCoverToCloudinary(file: File, slug: string) {
  const cloudName = getEnvValue(
    "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_CLOUD_NAME"
  ) || "dktp3tqgl";
  const uploadPreset = getEnvValue(
    "NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET",
    "CLOUDINARY_UPLOAD_PRESET"
  ) || "uniblex_uploads";
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || (!uploadPreset && (!apiKey || !apiSecret))) {
    throw new Error("Cloudinary cloud name and upload preset or API credentials are not configured.");
  }

  const cloudinaryData = new FormData();
  const folder = "uniblex/game-covers";
  cloudinaryData.set("file", file);
  cloudinaryData.set("folder", folder);
  cloudinaryData.set("public_id", slug);

  if (uploadPreset) {
    cloudinaryData.set("upload_preset", uploadPreset);
  } else if (apiKey && apiSecret) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    cloudinaryData.set("api_key", apiKey);
    cloudinaryData.set("timestamp", timestamp);
    cloudinaryData.set("signature", signCloudinaryParams({ folder, public_id: slug, timestamp }, apiSecret));
  }

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: cloudinaryData
  });

  const payload = await parseCloudinaryResponse(response);

  if (!response.ok || typeof payload.secure_url !== "string") {
    throw new Error(typeof payload.error?.message === "string" ? payload.error.message : "Cloudinary upload failed.");
  }

  return payload.secure_url as string;
}

function getEnvValue(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }

  return "";
}

function signCloudinaryParams(params: Record<string, string>, apiSecret: string) {
  const payload = Object.entries(params)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return createHash("sha1").update(`${payload}${apiSecret}`).digest("hex");
}

async function parseCloudinaryResponse(response: Response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text || "Cloudinary upload failed.");
  }
}
