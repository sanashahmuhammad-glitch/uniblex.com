import { randomUUID } from "crypto";
import type { R2MvpConfig } from "@/lib/r2Mvp";

export const GAME_MEDIA_MAX_BYTES = 15 * 1024 * 1024;
export const GAME_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const GAME_MEDIA_SIGNING_SECONDS = 60;

export type GameMediaRole = "cover" | "thumbnail" | `screenshot-${number}`;

export type GameMediaDescriptor = {
  draftId: string;
  role: GameMediaRole;
  name: string;
  contentType: string;
  size: number;
  sha256: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateGameMediaDescriptor(value: unknown): GameMediaDescriptor {
  if (!value || typeof value !== "object") throw new Error("Media metadata is invalid.");
  const input = value as Record<string, unknown>;
  const draftId = String(input.draftId || "");
  const role = String(input.role || "") as GameMediaRole;
  const name = String(input.name || "").trim().slice(0, 180);
  const contentType = String(input.contentType || "").toLowerCase();
  const size = Number(input.size);
  const sha256 = String(input.sha256 || "").toLowerCase();
  if (!uuidPattern.test(draftId)) throw new Error("Media draft ID is invalid.");
  if (!isGameMediaRole(role)) throw new Error("Media role is invalid.");
  if (!name || /[\u0000-\u001f\u007f]/.test(name)) throw new Error("Media filename is invalid.");
  if (!(GAME_MEDIA_TYPES as readonly string[]).includes(contentType)) throw new Error("Media must be a JPG, PNG, or WebP file.");
  if (!Number.isSafeInteger(size) || size < 1 || size > GAME_MEDIA_MAX_BYTES) throw new Error("Media must be 15 MB or smaller.");
  if (!/^[a-f0-9]{64}$/.test(sha256)) throw new Error("Media checksum is invalid.");
  return { draftId, role, name, contentType, size, sha256 };
}

export function isGameMediaRole(role: string): role is GameMediaRole {
  if (role === "cover" || role === "thumbnail") return true;
  const match = /^screenshot-([1-6])$/.exec(role);
  return Boolean(match);
}

export function gameMediaPrefix() {
  const environment = process.env.VERCEL_ENV;
  if (environment === "production") return "game-media";
  if (environment === "preview" || environment === "development" || process.env.NODE_ENV !== "production") {
    return "staging-game-media";
  }
  throw new Error("Media storage environment is not configured.");
}

export function createGameMediaKey(ownerId: string, descriptor: GameMediaDescriptor, id = randomUUID()) {
  if (!uuidPattern.test(ownerId) || !uuidPattern.test(id)) throw new Error("Media storage identity is invalid.");
  const extension = descriptor.contentType === "image/jpeg" ? "jpg" : descriptor.contentType === "image/png" ? "png" : "webp";
  return `${gameMediaPrefix()}/${ownerId}/${descriptor.draftId}/${descriptor.role}/${id}.${extension}`;
}

export function assertGameMediaKey(key: string, ownerId: string, draftId: string, role?: GameMediaRole) {
  if (!uuidPattern.test(ownerId) || !uuidPattern.test(draftId)) throw new Error("Media storage identity is invalid.");
  const expected = `${gameMediaPrefix()}/${ownerId}/${draftId}/`;
  if (!key.startsWith(expected) || key.length > 420 || key.includes("..") || /[\u0000-\u001f\u007f]/.test(key)) {
    throw new Error("Media object is outside this draft.");
  }
  const remainder = key.slice(expected.length);
  const [storedRole, filename, extra] = remainder.split("/");
  if (extra !== undefined || !isGameMediaRole(storedRole) || !/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(filename || "")) {
    throw new Error("Media object key is invalid.");
  }
  if (role && storedRole !== role) throw new Error("Media object role does not match.");
  return key;
}

export function gameMediaHeaders(ownerId: string, descriptor: GameMediaDescriptor) {
  return {
    "content-type": descriptor.contentType,
    "x-amz-meta-owner-id": ownerId,
    "x-amz-meta-draft-id": descriptor.draftId,
    "x-amz-meta-media-role": descriptor.role,
    "x-amz-meta-size-bytes": String(descriptor.size),
    "x-amz-meta-sha256": descriptor.sha256,
    "x-amz-checksum-sha256": Buffer.from(descriptor.sha256, "hex").toString("base64"),
    "if-none-match": "*"
  };
}

export function gameMediaPublicUrl(config: Pick<R2MvpConfig, "publicBaseUrl">, key: string) {
  return `${config.publicBaseUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export function verifyGameMediaHead(
  descriptor: GameMediaDescriptor,
  ownerId: string,
  headers: Headers
) {
  const contentLength = Number(headers.get("content-length") ?? headers.get("x-amz-meta-size-bytes"));
  const checksum = decodeChecksum(headers.get("x-amz-checksum-sha256"));
  if (contentLength !== descriptor.size) throw new Error("Uploaded media size verification failed.");
  if ((headers.get("content-type") || "").split(";")[0].trim().toLowerCase() !== descriptor.contentType) throw new Error("Uploaded media type verification failed.");
  if (headers.get("x-amz-meta-owner-id") !== ownerId || headers.get("x-amz-meta-draft-id") !== descriptor.draftId || headers.get("x-amz-meta-media-role") !== descriptor.role) {
    throw new Error("Uploaded media ownership verification failed.");
  }
  if (headers.get("x-amz-meta-sha256")?.toLowerCase() !== descriptor.sha256 || checksum !== descriptor.sha256) {
    throw new Error("Uploaded media checksum verification failed.");
  }
}

function decodeChecksum(value: string | null) {
  if (!value) return "";
  try {
    const decoded = Buffer.from(value.trim(), "base64");
    return decoded.length === 32 ? decoded.toString("hex") : "";
  } catch {
    return "";
  }
}
