import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { inflateRawSync } from "node:zlib";
import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/serverAdminAuth";
import { slugify } from "@/lib/slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ZipEntry = {
  name: string;
  data: Buffer;
};

const maxZipSize = 250 * 1024 * 1024;

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
      if (!gameZip.name.toLowerCase().endsWith(".zip")) {
        return NextResponse.json({ error: "Game upload must be a .zip file." }, { status: 400 });
      }

      if (gameZip.size > maxZipSize) {
        return NextResponse.json({ error: "ZIP file is too large. Keep WebGL builds under 250MB." }, { status: 400 });
      }

      const buffer = Buffer.from(await gameZip.arrayBuffer());
      await extractGameZip(buffer, slug);
      result.iframeUrl = `/games/${slug}/index.html`;
      result.messages.push(`Game ZIP extracted to public/games/${slug}/.`);
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

async function extractGameZip(buffer: Buffer, slug: string) {
  const entries = readZipEntries(buffer);
  const indexEntry = entries.find((entry) => path.posix.basename(entry.name).toLowerCase() === "index.html");

  if (!indexEntry) {
    throw new Error("ZIP must contain an index.html file.");
  }

  const stripPrefix = path.posix.dirname(indexEntry.name);
  const outputRoot = path.join(process.cwd(), "public", "games", slug);

  await mkdir(outputRoot, { recursive: true });

  for (const entry of entries) {
    const relativeName = normalizeZipEntryName(stripZipPrefix(entry.name, stripPrefix));
    if (!relativeName) continue;

    const outputPath = path.resolve(outputRoot, relativeName);
    if (!outputPath.startsWith(path.resolve(outputRoot) + path.sep)) {
      throw new Error("ZIP contains an unsafe file path.");
    }

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, entry.data);
  }
}

function readZipEntries(buffer: Buffer) {
  const entries: ZipEntry[] = [];
  const centralDirectoryOffset = findCentralDirectoryOffset(buffer);
  const totalEntries = buffer.readUInt16LE(centralDirectoryOffset + 10);
  let offset = buffer.readUInt32LE(centralDirectoryOffset + 16);

  for (let index = 0; index < totalEntries; index += 1) {
    const signature = buffer.readUInt32LE(offset);
    if (signature !== 0x02014b50) {
      throw new Error("ZIP central directory is invalid.");
    }

    const flags = buffer.readUInt16LE(offset + 8);
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const nameStart = offset + 46;
    const rawName = buffer.subarray(nameStart, nameStart + nameLength).toString("utf8");
    const normalizedName = normalizeZipEntryName(rawName);

    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || localHeaderOffset === 0xffffffff) {
      throw new Error("ZIP64 archives are not supported. Re-zip a smaller WebGL build and try again.");
    }

    if (flags & 0x01) {
      throw new Error("Encrypted ZIP files are not supported.");
    }

    if (normalizedName && !normalizedName.endsWith("/")) {
      const localSignature = buffer.readUInt32LE(localHeaderOffset);
      if (localSignature !== 0x04034b50) {
        throw new Error("ZIP local file header is invalid.");
      }

      const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
      const dataEnd = dataStart + compressedSize;

      if (dataEnd > buffer.length) {
        throw new Error("ZIP file is invalid or truncated.");
      }

      const compressedData = buffer.subarray(dataStart, dataEnd);
      const data = inflateZipEntry(compressedData, method, uncompressedSize);
      entries.push({ name: normalizedName, data });
    }

    offset = nameStart + nameLength + extraLength + commentLength;
  }

  if (!entries.length) {
    throw new Error("ZIP file does not contain extractable files.");
  }

  return entries;
}

function findCentralDirectoryOffset(buffer: Buffer) {
  const minimumOffset = Math.max(0, buffer.length - 65557);

  for (let offset = buffer.length - 22; offset >= minimumOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }

  throw new Error("ZIP end-of-central-directory record was not found.");
}

function inflateZipEntry(data: Buffer, method: number, expectedSize: number) {
  if (method === 0) return data;
  if (method === 8) {
    const inflated = inflateRawSync(data);
    if (expectedSize && inflated.length !== expectedSize) {
      throw new Error("ZIP entry failed size validation.");
    }
    return inflated;
  }

  throw new Error("ZIP compression method is not supported.");
}

function normalizeZipEntryName(name: string) {
  const normalized = name.replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = normalized.split("/").filter(Boolean);

  if (!parts.length || parts.some((part) => part === "." || part === "..")) {
    return "";
  }

  return parts.join("/");
}

function stripZipPrefix(name: string, prefix: string) {
  if (!prefix || prefix === ".") return name;
  return name === prefix ? "" : name.startsWith(`${prefix}/`) ? name.slice(prefix.length + 1) : name;
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
