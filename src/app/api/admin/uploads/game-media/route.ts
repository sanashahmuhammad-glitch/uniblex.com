import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/serverAdminAuth";
import { areR2GameUploadsEnabled } from "@/lib/r2GameUploads";
import { deleteMvpObject, getR2MvpConfig, headR2ObjectResponse, presignMvpPut } from "@/lib/r2Mvp";
import {
  assertGameMediaKey,
  createGameMediaKey,
  GAME_MEDIA_SIGNING_SECONDS,
  gameMediaHeaders,
  gameMediaPublicUrl,
  validateGameMediaDescriptor,
  verifyGameMediaHead
} from "@/lib/r2GameMedia";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!areR2GameUploadsEnabled()) return NextResponse.json({ error: "Game uploads are currently quarantined." }, { status: 503 });
  const ownerId = auth.user?.id;
  if (!ownerId) return NextResponse.json({ error: "Admin identity is unavailable." }, { status: 401 });

  try {
    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action || "");
    const config = getR2MvpConfig();

    if (action === "sign") {
      const descriptor = validateGameMediaDescriptor(body.file);
      const objectKey = createGameMediaKey(ownerId, descriptor);
      const headers = {
        ...gameMediaHeaders(ownerId, descriptor),
        "cache-control": "public, max-age=31536000, immutable"
      };
      return NextResponse.json({
        objectKey,
        uploadUrl: presignMvpPut(config, objectKey, headers, GAME_MEDIA_SIGNING_SECONDS),
        publicUrl: gameMediaPublicUrl(config, objectKey),
        requiredHeaders: headers,
        expiresAt: new Date(Date.now() + GAME_MEDIA_SIGNING_SECONDS * 1000).toISOString()
      });
    }

    if (action === "verify") {
      const descriptor = validateGameMediaDescriptor(body.file);
      const objectKey = assertGameMediaKey(String(body.objectKey || ""), ownerId, descriptor.draftId, descriptor.role);
      const response = await headR2ObjectResponse(config, objectKey);
      if (!response.ok) return NextResponse.json({ error: "Uploaded media object was not found." }, { status: 409 });
      verifyGameMediaHead(descriptor, ownerId, response.headers);
      return NextResponse.json({
        verified: true,
        objectKey,
        publicUrl: gameMediaPublicUrl(config, objectKey),
        metadata: { role: descriptor.role, name: descriptor.name, contentType: descriptor.contentType, size: descriptor.size, sha256: descriptor.sha256 }
      });
    }

    if (action === "cleanup") {
      const draftId = String(body.draftId || "");
      const keys = Array.isArray(body.objectKeys) ? [...new Set(body.objectKeys.map(String))] : [];
      if (keys.length > 8) throw new Error("Too many media objects were requested for cleanup.");
      const validated = keys.map((key) => assertGameMediaKey(key, ownerId, draftId));
      await Promise.all(validated.map((key) => deleteMvpObject(config, key)));
      return NextResponse.json({ cleaned: validated.length });
    }

    return NextResponse.json({ error: "Media upload action is invalid." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: safeMediaError(error) }, { status: 400 });
  }
}

function safeMediaError(error: unknown) {
  const message = error instanceof Error ? error.message : "Media upload could not be completed.";
  if (/access.?key|secret|signature|credential|x-amz-/i.test(message)) return "Media upload could not be completed.";
  return message.slice(0, 240);
}
