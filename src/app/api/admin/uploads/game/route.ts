import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/serverAdminAuth";
import { slugify } from "@/lib/slug";

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
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim();

  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary cloud name and upload preset are not configured.");
  }

  const cloudinaryData = new FormData();
  cloudinaryData.set("file", file);
  cloudinaryData.set("upload_preset", uploadPreset);
  cloudinaryData.set("folder", "uniblex/game-covers");
  cloudinaryData.set("public_id", slug);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: cloudinaryData
  });

  const payload = await response.json();

  if (!response.ok || typeof payload.secure_url !== "string") {
    throw new Error(typeof payload.error?.message === "string" ? payload.error.message : "Cloudinary upload failed.");
  }

  return payload.secure_url as string;
}
