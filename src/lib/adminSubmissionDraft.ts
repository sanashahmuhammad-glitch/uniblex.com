"use client";

import { EMPTY_GAME_FORM, GAME_ENGINES, type GameEngine, type GameFormState } from "@/components/admin/adminUploadLogic";
import type { GameMediaRole } from "@/lib/r2GameMedia";

export const ADMIN_DRAFT_VERSION = 1;
export const ADMIN_DRAFT_EXPIRY_MS = 14 * 24 * 60 * 60 * 1000;
const databaseName = "uniblex-admin-upload-drafts";
const storeName = "drafts";
let fallbackIdCounter = 0;

export type PersistedMediaSelection = {
  role: GameMediaRole;
  name: string;
  contentType: string;
  size: number;
  lastModified: number;
  status: "needs-reselection" | "verified";
  objectKey?: string;
  publicUrl?: string;
  sha256?: string;
};

export type PersistedZipSelection = {
  name: string;
  contentType: string;
  size: number;
  lastModified: number;
  status: "needs-reselection" | "verified";
};

export type PersistedBuildResult = {
  operationId: string;
  gameId: string;
  previewUrl: string;
  buildType: string;
  compressionMode: string;
  fileCount: number;
  totalBytes: number;
};

export type AdminSubmissionDraft = {
  version: typeof ADMIN_DRAFT_VERSION;
  storageKey: string;
  draftId: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  currentStep: number;
  form: GameFormState;
  media: PersistedMediaSelection[];
  zip: PersistedZipSelection | null;
  buildResult: PersistedBuildResult | null;
};

export function createAdminRuntimeId() {
  const cryptoApi = typeof globalThis === "object" ? globalThis.crypto : undefined;
  if (typeof cryptoApi?.randomUUID === "function") return cryptoApi.randomUUID();

  const bytes = new Uint8Array(16);
  if (typeof cryptoApi?.getRandomValues === "function") cryptoApi.getRandomValues(bytes);
  else {
    let seed = Date.now() + Math.floor(Math.random() * 0x100000000) + fallbackIdCounter++;
    for (let index = 0; index < bytes.length; index += 1) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      bytes[index] = seed & 0xff;
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return formatBytesAsUuid(bytes);
}

export function createAdminSubmissionDraft(ownerId: string, now = new Date()): AdminSubmissionDraft {
  const draftId = createAdminRuntimeId();
  return {
    version: ADMIN_DRAFT_VERSION,
    storageKey: storageKey(ownerId, draftId),
    draftId,
    ownerId,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ADMIN_DRAFT_EXPIRY_MS).toISOString(),
    currentStep: 0,
    form: { ...EMPTY_GAME_FORM, screenshotUrls: [] },
    media: [],
    zip: null,
    buildResult: null
  };
}

export function initializeAdminSubmissionDraft(
  current: AdminSubmissionDraft | null,
  restored: AdminSubmissionDraft | null,
  ownerId: string,
  createDraft: (ownerId: string) => AdminSubmissionDraft = createAdminSubmissionDraft
) {
  return current ?? restored ?? createDraft(ownerId);
}

export function sanitizeAdminSubmissionDraft(value: unknown, expectedOwnerId?: string, now = Date.now()): AdminSubmissionDraft | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const ownerId = text(input.ownerId, 80);
  const draftId = text(input.draftId, 80);
  if (input.version !== ADMIN_DRAFT_VERSION || !uuid(ownerId) || !uuid(draftId) || (expectedOwnerId && ownerId !== expectedOwnerId)) return null;
  const expiresAt = new Date(String(input.expiresAt || ""));
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= now) return null;
  const createdAt = iso(input.createdAt) || new Date(now).toISOString();
  const updatedAt = iso(input.updatedAt) || createdAt;
  const formInput = input.form && typeof input.form === "object" ? input.form as Record<string, unknown> : {};
  const form = sanitizeForm(formInput);
  const media = Array.isArray(input.media) ? input.media.map(sanitizeMedia).filter((item): item is PersistedMediaSelection => Boolean(item)).slice(0, 8) : [];
  const zip = sanitizeZip(input.zip);
  const buildResult = sanitizeBuildResult(input.buildResult);
  return {
    version: ADMIN_DRAFT_VERSION,
    storageKey: storageKey(ownerId, draftId),
    draftId,
    ownerId,
    createdAt,
    updatedAt,
    expiresAt: expiresAt.toISOString(),
    currentStep: Math.max(0, Math.min(4, Number.isInteger(input.currentStep) ? Number(input.currentStep) : 0)),
    form,
    media,
    zip,
    buildResult
  };
}

export function isMeaningfulAdminDraft(draft: AdminSubmissionDraft) {
  const form = draft.form;
  return draft.currentStep > 0 || draft.media.length > 0 || Boolean(draft.zip || draft.buildResult) || Object.entries(form).some(([key, value]) => {
    const initial = EMPTY_GAME_FORM[key as keyof GameFormState];
    return Array.isArray(value) ? value.length > 0 : value !== initial;
  });
}

export async function saveAdminSubmissionDraft(draft: AdminSubmissionDraft) {
  const next = sanitizeAdminSubmissionDraft({ ...draft, updatedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + ADMIN_DRAFT_EXPIRY_MS).toISOString() }, draft.ownerId);
  if (!next) throw new Error("Draft could not be saved safely.");
  const db = await openDatabase();
  await transactionRequest(db, "readwrite", (store) => store.put(next));
  db.close();
  return next;
}

export async function loadLatestAdminSubmissionDraft(ownerId: string) {
  const db = await openDatabase();
  const records = await transactionRequest<unknown[]>(db, "readonly", (store) => store.getAll());
  const expiredKeys: string[] = [];
  const drafts = records.map((record) => {
    const draft = sanitizeAdminSubmissionDraft(record, ownerId);
    if (!draft && record && typeof record === "object" && (record as Record<string, unknown>).ownerId === ownerId) expiredKeys.push(String((record as Record<string, unknown>).storageKey || ""));
    return draft;
  }).filter((draft): draft is AdminSubmissionDraft => draft !== null).filter(isMeaningfulAdminDraft);
  if (expiredKeys.length) await Promise.all(expiredKeys.filter(Boolean).map((key) => transactionRequest(db, "readwrite", (store) => store.delete(key))));
  db.close();
  return drafts.sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0] || null;
}

export async function deleteAdminSubmissionDraft(ownerId: string, draftId: string) {
  const db = await openDatabase();
  await transactionRequest(db, "readwrite", (store) => store.delete(storageKey(ownerId, draftId)));
  db.close();
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!globalThis.indexedDB) return reject(new Error("IndexedDB is unavailable; this draft cannot be safely persisted."));
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName, { keyPath: "storageKey" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Draft storage could not be opened."));
  });
}

function transactionRequest<T = unknown>(db: IDBDatabase, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const request = operation(transaction.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Draft storage operation failed."));
    transaction.onabort = () => reject(new Error("Draft storage transaction was interrupted."));
  });
}

function sanitizeMedia(value: unknown): PersistedMediaSelection | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const role = text(input.role, 30) as GameMediaRole;
  if (!(role === "cover" || role === "thumbnail" || /^screenshot-[1-6]$/.test(role))) return null;
  const contentType = text(input.contentType, 40);
  const size = Number(input.size);
  const status = input.status === "verified" ? "verified" : "needs-reselection";
  const objectKey = status === "verified" ? safeObjectKey(input.objectKey) : "";
  const publicUrl = status === "verified" ? safePublicUrl(input.publicUrl) : "";
  const sha256 = status === "verified" && /^[a-f0-9]{64}$/.test(String(input.sha256 || "")) ? String(input.sha256) : "";
  if (!text(input.name, 180) || !["image/jpeg", "image/png", "image/webp"].includes(contentType) || !Number.isSafeInteger(size) || size < 1 || size > 15 * 1024 * 1024) return null;
  if (status === "verified" && (!objectKey || !publicUrl || !sha256)) return null;
  return { role, name: text(input.name, 180), contentType, size, lastModified: Math.max(0, Number(input.lastModified) || 0), status, ...(objectKey ? { objectKey, publicUrl, sha256 } : {}) };
}

function sanitizeZip(value: unknown): PersistedZipSelection | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const name = text(input.name, 180);
  const size = Number(input.size);
  if (!name.toLowerCase().endsWith(".zip") || !Number.isSafeInteger(size) || size < 1 || size > 1024 * 1024 * 1024) return null;
  return { name, contentType: text(input.contentType, 80), size, lastModified: Math.max(0, Number(input.lastModified) || 0), status: input.status === "verified" ? "verified" : "needs-reselection" };
}

function sanitizeForm(input: Record<string, unknown>): GameFormState {
  const stringFields: Array<[keyof GameFormState, number]> = [
    ["title", 160], ["slug", 180], ["shortDescription", 220], ["description", 5000],
    ["categoryId", 80], ["tags", 600], ["iframeUrl", 1000], ["loadingInstructions", 2000], ["controls", 4000]
  ];
  const form: GameFormState = { ...EMPTY_GAME_FORM, screenshotUrls: [] };
  for (const [key, length] of stringFields) (form[key] as string) = text(input[key], length);
  const engine = text(input.engine, 80) as GameEngine;
  form.engine = GAME_ENGINES.includes(engine) ? engine : EMPTY_GAME_FORM.engine;
  const booleanFields: Array<keyof GameFormState> = [
    "desktopSupport", "mobileSupport", "keyboardControls", "touchControls", "gamepadSupport", "multiplayer", "savesProgress"
  ];
  for (const key of booleanFields) (form[key] as boolean) = input[key] === true;
  const orientation = text(input.orientation, 20);
  form.orientation = orientation === "portrait" || orientation === "any" ? orientation : "landscape";
  const aspectRatio = text(input.aspectRatio, 20);
  form.aspectRatio = (["16/9", "16/10", "4/3", "9/16", "1/1"] as const).includes(aspectRatio as GameFormState["aspectRatio"])
    ? aspectRatio as GameFormState["aspectRatio"]
    : "16/9";
  form.coverUrl = safePublicUrl(input.coverUrl);
  form.thumbnailUrl = safePublicUrl(input.thumbnailUrl);
  form.screenshotUrls = Array.isArray(input.screenshotUrls) ? input.screenshotUrls.map(safePublicUrl).filter(Boolean).slice(0, 6) : [];
  return form;
}

function sanitizeBuildResult(value: unknown): PersistedBuildResult | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const operationId = text(input.operationId, 80);
  const gameId = text(input.gameId, 80);
  if (!uuid(operationId) || !uuid(gameId)) return null;
  return { operationId, gameId, previewUrl: safePublicUrl(input.previewUrl), buildType: text(input.buildType, 80), compressionMode: text(input.compressionMode, 80), fileCount: Math.max(0, Number(input.fileCount) || 0), totalBytes: Math.max(0, Number(input.totalBytes) || 0) };
}

function storageKey(ownerId: string, draftId: string) { return `${ownerId}:${draftId}`; }
function formatBytesAsUuid(bytes: Uint8Array) {
  const value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}
function uuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
function text(value: unknown, length: number) { return typeof value === "string" ? value.trim().slice(0, length) : ""; }
function iso(value: unknown) { const date = new Date(String(value || "")); return Number.isFinite(date.getTime()) ? date.toISOString() : ""; }
function safePublicUrl(value: unknown) { try { const url = new URL(String(value || "")); if (url.protocol !== "https:" || url.username || url.password || /(?:x-amz-|token|signature|credential)/i.test(url.search)) return ""; url.hash = ""; return url.toString(); } catch { return ""; } }
function safeObjectKey(value: unknown) { const key = text(value, 420); return /^staging-game-media\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/(cover|thumbnail|screenshot-[1-6])\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(key) ? key : ""; }
