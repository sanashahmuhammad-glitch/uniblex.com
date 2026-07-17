import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/serverAdminAuth";
import { slugify } from "@/lib/slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageBytes = 15 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });

  try {
    const formData = await request.formData();
    const slug = slugify(String(formData.get("slug") || formData.get("title") || ""));
    if (!slug) return NextResponse.json({ error: "A valid game slug is required for media uploads." }, { status: 400 });

    const cover = optionalImage(formData.get("coverImage"), "Cover image");
    const thumbnail = optionalImage(formData.get("thumbnailImage"), "Card thumbnail");
    const screenshots = formData.getAll("screenshots").map((value, index) => requiredImage(value, `Screenshot ${index + 1}`));
    if (screenshots.length > 6) return NextResponse.json({ error: "A maximum of 6 screenshots is allowed." }, { status: 400 });

    const [coverUrl, thumbnailUrl, screenshotUrls] = await Promise.all([
      cover ? uploadToCloudinary(cover, `${slug}-cover`, "uniblex/game-covers") : Promise.resolve(""),
      thumbnail ? uploadToCloudinary(thumbnail, `${slug}-thumbnail`, "uniblex/game-thumbnails") : Promise.resolve(""),
      Promise.all(screenshots.map((file, index) => uploadToCloudinary(file, `${slug}-screenshot-${index + 1}`, "uniblex/game-screenshots")))
    ]);

    return NextResponse.json({ coverUrl, thumbnailUrl, screenshotUrls });
  } catch (error) {
    return NextResponse.json({ error: safeMediaError(error) }, { status: 400 });
  }
}

function optionalImage(value: FormDataEntryValue | null, label: string) {
  if (!(value instanceof File) || value.size === 0) return null;
  return validateImage(value, label);
}

function requiredImage(value: FormDataEntryValue, label: string) {
  if (!(value instanceof File) || value.size === 0) throw new Error(`${label} is missing.`);
  return validateImage(value, label);
}

function validateImage(file: File, label: string) {
  if (!allowedImageTypes.has(file.type)) throw new Error(`${label} must be a JPG, PNG, or WebP file.`);
  if (file.size > maxImageBytes) throw new Error(`${label} must be 15 MB or smaller.`);
  return file;
}

async function uploadToCloudinary(file: File, publicId: string, folder: string) {
  const cloudName = env("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "CLOUDINARY_CLOUD_NAME") || "dktp3tqgl";
  const uploadPreset = env("NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET", "CLOUDINARY_UPLOAD_PRESET") || "uniblex_uploads";
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || (!uploadPreset && (!apiKey || !apiSecret))) throw new Error("Media storage is not configured.");

  const body = new FormData();
  body.set("file", file);
  body.set("folder", folder);
  body.set("public_id", publicId);
  if (uploadPreset) {
    body.set("upload_preset", uploadPreset);
  } else if (apiKey && apiSecret) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    body.set("api_key", apiKey);
    body.set("timestamp", timestamp);
    body.set("signature", sign({ folder, public_id: publicId, timestamp }, apiSecret));
  }

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body });
  const payload = await response.json().catch(() => ({})) as { secure_url?: string; error?: { message?: string } };
  if (!response.ok || !payload.secure_url) throw new Error(payload.error?.message || "Media upload failed.");
  return payload.secure_url;
}

function env(...keys: string[]) {
  for (const key of keys) { const value = process.env[key]?.trim(); if (value) return value; }
  return "";
}

function sign(params: Record<string, string>, secret: string) {
  const values = Object.entries(params).sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => `${key}=${value}`).join("&");
  return createHash("sha1").update(`${values}${secret}`).digest("hex");
}

function safeMediaError(error: unknown) {
  const message = error instanceof Error ? error.message : "Media upload failed.";
  if (/cloudinary|api[_ -]?key|secret|signature|preset/i.test(message)) return "Media upload could not be completed.";
  return message.slice(0, 240);
}
