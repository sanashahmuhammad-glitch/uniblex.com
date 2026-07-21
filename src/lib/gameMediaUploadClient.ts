"use client";

import { supabase } from "@/lib/supabase";
import type { GameMediaRole } from "@/lib/r2GameMedia";

export type GameMediaUploadPhase = "hashing" | "signing" | "uploading" | "verifying" | "verified" | "failed" | "cancelled";

export type VerifiedGameMedia = {
  role: GameMediaRole;
  name: string;
  contentType: string;
  size: number;
  lastModified: number;
  sha256: string;
  objectKey: string;
  publicUrl: string;
};

export type GameMediaUploadProgress = {
  role: GameMediaRole;
  phase: GameMediaUploadPhase;
  loaded: number;
  total: number;
  percentage: number;
};

type MediaApiResponse = Record<string, unknown>;

export async function uploadGameMediaFile(
  file: File,
  draftId: string,
  role: GameMediaRole,
  onProgress: (progress: GameMediaUploadProgress) => void,
  signal: AbortSignal
): Promise<VerifiedGameMedia> {
  validateBrowserFile(file);
  report(onProgress, role, "hashing", 0, file.size);
  const sha256 = await hashFile(file, signal);
  report(onProgress, role, "signing", 0, file.size);
  const descriptor = { draftId, role, name: file.name, contentType: file.type, size: file.size, sha256 };
  const signed = await mediaApi({ action: "sign", file: descriptor }, signal);
  const objectKey = requireText(signed.objectKey, "Media signing response is incomplete.");
  try {
    await putFile(requireText(signed.uploadUrl, "Media signing response is incomplete."), file, asHeaders(signed.requiredHeaders), role, onProgress, signal);
    report(onProgress, role, "verifying", file.size, file.size);
    const verified = await mediaApi({ action: "verify", file: descriptor, objectKey }, signal);
    report(onProgress, role, "verified", file.size, file.size);
    return {
      role,
      name: file.name,
      contentType: file.type,
      size: file.size,
      lastModified: file.lastModified,
      sha256,
      objectKey,
      publicUrl: requireText(verified.publicUrl, "Media verification response is incomplete.")
    };
  } catch (error) {
    void cleanupGameMedia(draftId, [objectKey]).catch(() => undefined);
    report(onProgress, role, signal.aborted ? "cancelled" : "failed", 0, file.size);
    throw error;
  }
}

export async function cleanupGameMedia(draftId: string, objectKeys: string[]) {
  if (!objectKeys.length) return;
  await mediaApi({ action: "cleanup", draftId, objectKeys }, undefined);
}

export function mediaRoleLabel(role: GameMediaRole) {
  if (role === "cover") return "Cover image";
  if (role === "thumbnail") return "Card thumbnail";
  return `Screenshot ${Number(role.split("-")[1])}`;
}

async function mediaApi(body: Record<string, unknown>, signal?: AbortSignal) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Admin session expired. Sign in again.");
  const response = await fetch("/api/admin/uploads/game-media", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    signal
  });
  const payload = await response.json().catch(() => ({})) as MediaApiResponse;
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Media upload failed.");
  return payload;
}

function putFile(
  uploadUrl: string,
  file: File,
  headers: Record<string, string>,
  role: GameMediaRole,
  onProgress: (progress: GameMediaUploadProgress) => void,
  signal: AbortSignal
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    xhr.open("PUT", uploadUrl);
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (event) => report(onProgress, role, "uploading", event.loaded, event.lengthComputable ? event.total : file.size);
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Direct media upload failed with HTTP ${xhr.status}.`));
    xhr.onerror = () => reject(new Error("Direct media upload failed because of a network or R2 CORS error."));
    xhr.onabort = () => reject(new DOMException("Media upload cancelled.", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    const finish = () => signal.removeEventListener("abort", abort);
    xhr.onloadend = finish;
    if (signal.aborted) abort(); else xhr.send(file);
  });
}

async function hashFile(file: File, signal: AbortSignal) {
  if (signal.aborted) throw new DOMException("Media upload cancelled.", "AbortError");
  const bytes = await file.arrayBuffer();
  if (signal.aborted) throw new DOMException("Media upload cancelled.", "AbortError");
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function validateBrowserFile(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error(`${file.name} must be a JPG, PNG, or WebP file.`);
  if (!file.size || file.size > 15 * 1024 * 1024) throw new Error(`${file.name} must be 15 MB or smaller.`);
}

function asHeaders(value: unknown) {
  if (!value || typeof value !== "object") throw new Error("Media signing headers are missing.");
  const entries = Object.entries(value as Record<string, unknown>);
  if (!entries.length || entries.some(([, header]) => typeof header !== "string")) throw new Error("Media signing headers are invalid.");
  return Object.fromEntries(entries) as Record<string, string>;
}

function requireText(value: unknown, message: string) {
  if (typeof value !== "string" || !value) throw new Error(message);
  return value;
}

function report(onProgress: (progress: GameMediaUploadProgress) => void, role: GameMediaRole, phase: GameMediaUploadPhase, loaded: number, total: number) {
  onProgress({ role, phase, loaded, total, percentage: total ? Math.min(100, Math.round((loaded / total) * 100)) : 0 });
}
