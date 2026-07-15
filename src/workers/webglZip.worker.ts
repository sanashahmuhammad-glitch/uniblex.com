/// <reference lib="webworker" />

import {
  WEBGL_MVP_LIMITS,
  normalizeWebglPath,
  stableManifestJson,
  type WebglBuildType,
  type WebglCompressionMode,
  type WebglManifest,
  type WebglManifestEntry
} from "../lib/webglMvpManifest";
import {detectWebglBuild,selectArchiveRoot} from "../lib/webglBuildDetection";
import {IncrementalSha256} from "../lib/incrementalSha256";

type AnalyzeMessage = { id: string; type: "analyze"; file: File; sessionId: string };
type ReadMessage = { id: string; type: "read"; sessionId: string; path: string };
type ClearMessage = { id: string; type: "clear"; sessionId: string };
type CancelMessage = { id: string; type: "cancel"; sessionId: string };
type WorkerMessage = AnalyzeMessage | ReadMessage | ClearMessage | CancelMessage;

type CentralEntry = {
  originalPath: string;
  path: string;
  flags: number;
  method: number;
  crc: number;
  compressedSize: number;
  size: number;
  localOffset: number;
  externalAttributes: number;
};

const databaseName = "uniblex-webgl-mvp";
const storeName = "files";
const cancelled = new Set<string>();

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  void handleMessage(event.data).catch((error) => {
    postMessage({ id: event.data.id, type: "error", error: error instanceof Error ? error.message : "Unable to process ZIP." });
  });
};

async function handleMessage(message: WorkerMessage) {
  if (message.type === "cancel") {
    cancelled.add(message.sessionId);
    await clearSession(message.sessionId);
    postMessage({ id: message.id, type: "cancelled" });
    return;
  }
  if (message.type === "clear") {
    await clearSession(message.sessionId);
    cancelled.delete(message.sessionId);
    postMessage({ id: message.id, type: "cleared" });
    return;
  }
  if (message.type === "read") {
    const blob = await readStoredBlob(message.sessionId, normalizeWebglPath(message.path));
    if (!blob) throw new Error("Extracted file is no longer available in this browser session.");
    postMessage({ id: message.id, type: "file", path: message.path, blob });
    return;
  }
  const result = await analyzeArchive(message.file, message.id, message.sessionId);
  postMessage({ id: message.id, type: "result", ...result });
}

async function analyzeArchive(file: File, requestId: string, sessionId: string) {
  if (!file.name.toLowerCase().endsWith(".zip")) throw new Error("Game upload must be a ZIP file.");
  if (file.size <= 0 || file.size > WEBGL_MVP_LIMITS.maxZipBytes) throw new Error("ZIP exceeds the 1 GB MVP limit.");
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) throw new Error("ZIP extraction session is invalid.");
  try {
    const central = await readCentralDirectory(file);
    const layout = selectArchiveRoot(central.map((entry) => entry.originalPath));
    const entries = central.map((entry, index) => ({ ...entry, path: layout.paths[index] }));

    const files: WebglManifestEntry[] = [];
    let extracted = 0;
    let indexHtml = "";
    for (let index = 0; index < entries.length; index += 1) {
      if (cancelled.has(sessionId)) throw new Error("ZIP processing was cancelled.");
      const entry = entries[index];
      const blob = await extractEntry(file, entry);
      extracted += blob.size;
      if (extracted > WEBGL_MVP_LIMITS.maxExtractedBytes) throw new Error("ZIP exceeds the 4 GB extracted-size limit.");
      if (entry.path === "index.html" && blob.size > 5 * 1024 * 1024) throw new Error("index.html is too large.");
      const {crc32:actualCrc,sha256} = await hashBlob(blob,sessionId);
      if (actualCrc !== entry.crc) throw new Error(`ZIP CRC validation failed: ${entry.path}`);
      await storeBlob(sessionId, entry.path, blob);
      if (entry.path === "index.html") {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        indexHtml = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      }
      files.push({
        path: entry.path,
        size: blob.size,
        sha256,
        crc32: actualCrc.toString(16).padStart(8, "0"),
        ...hostingMetadata(entry.path)
      });
      postMessage({ id: requestId, type: "progress", phase: "extracting", completedFiles: index + 1, totalFiles: entries.length, completedBytes: extracted });
    }
    files.sort((left, right) => left.path.localeCompare(right.path));
    const detection = detectWebglBuild(indexHtml, files.map((entry) => entry.path));
    const manifest: WebglManifest = {
      schemaVersion: 1,
      entryPath: "index.html",
      buildType: detection.buildType,
      compressionMode: detection.compressionMode,
      requiredPaths: detection.requiredPaths,
      totalBytes: extracted,
      files
    };
    const manifestHash = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(stableManifestJson(manifest))));
    cancelled.delete(sessionId);
    return { sessionId, manifest, manifestHash };
  } catch (error) {
    await clearSession(sessionId);
    cancelled.delete(sessionId);
    throw error;
  }
}

async function readCentralDirectory(file: File) {
  const tailSize = Math.min(file.size, 65_557);
  const tailOffset = file.size - tailSize;
  const tail = new Uint8Array(await file.slice(tailOffset).arrayBuffer());
  let eocd = -1;
  for (let index = tail.length - 22; index >= 0; index -= 1) {
    if (readU32(tail, index) === 0x06054b50) { eocd = index; break; }
  }
  if (eocd < 0) throw new Error("ZIP end-of-central-directory record is missing.");
  const view = new DataView(tail.buffer, tail.byteOffset + eocd);
  const disk = view.getUint16(4, true);
  const centralDisk = view.getUint16(6, true);
  const diskEntries = view.getUint16(8, true);
  const totalEntries = view.getUint16(10, true);
  const centralSize = view.getUint32(12, true);
  const centralOffset = view.getUint32(16, true);
  if (disk !== 0 || centralDisk !== 0 || diskEntries !== totalEntries) throw new Error("Multi-disk ZIP files are not supported.");
  if (totalEntries === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) throw new Error("ZIP64 archives are not supported by the MVP uploader.");
  if (!totalEntries || totalEntries > WEBGL_MVP_LIMITS.maxFiles) throw new Error("ZIP file count exceeds the MVP limit.");
  if (centralSize > 16 * 1024 * 1024 || centralOffset + centralSize > file.size) throw new Error("ZIP central directory is invalid.");
  const bytes = new Uint8Array(await file.slice(centralOffset, centralOffset + centralSize).arrayBuffer());
  const entries: CentralEntry[] = [];
  let offset = 0;
  let total = 0;
  let recordCount = 0;
  const rawSeen = new Set<string>();
  while (offset < bytes.length && recordCount < totalEntries) {
    if (readU32(bytes, offset) !== 0x02014b50 || offset + 46 > bytes.length) throw new Error("ZIP central directory entry is malformed.");
    recordCount += 1;
    const data = new DataView(bytes.buffer, bytes.byteOffset + offset, 46);
    const flags = data.getUint16(8, true);
    const method = data.getUint16(10, true);
    const crc = data.getUint32(16, true);
    const compressedSize = data.getUint32(20, true);
    const size = data.getUint32(24, true);
    const nameLength = data.getUint16(28, true);
    const extraLength = data.getUint16(30, true);
    const commentLength = data.getUint16(32, true);
    const externalAttributes = data.getUint32(38, true);
    const localOffset = data.getUint32(42, true);
    const end = offset + 46 + nameLength + extraLength + commentLength;
    if (end > bytes.length || !nameLength) throw new Error("ZIP central directory entry is truncated.");
    const originalPath = decodeName(bytes.slice(offset + 46, offset + 46 + nameLength), flags);
    offset = end;
    if (originalPath.endsWith("/")) continue;
    if (flags & 1) throw new Error("Encrypted ZIP entries are not supported.");
    if (method !== 0 && method !== 8) throw new Error("ZIP uses an unsupported compression method.");
    const unixMode = externalAttributes >>> 16;
    if ((unixMode & 0xf000) === 0xa000) throw new Error("ZIP symbolic links are not allowed.");
    const normalized = normalizeWebglPath(originalPath);
    const folded = normalized.toLocaleLowerCase("en-US");
    if (rawSeen.has(folded)) throw new Error("ZIP contains duplicate normalized paths.");
    rawSeen.add(folded);
    if (size > WEBGL_MVP_LIMITS.maxFileBytes) throw new Error(`ZIP file exceeds the 512 MB per-file limit: ${normalized}`);
    if (size > 0 && compressedSize === 0) throw new Error("ZIP contains invalid size metadata.");
    if (compressedSize > 0 && size / compressedSize > WEBGL_MVP_LIMITS.maxCompressionRatio) throw new Error("ZIP entry exceeds the compression-ratio limit.");
    total += size;
    if (total > WEBGL_MVP_LIMITS.maxExtractedBytes) throw new Error("ZIP exceeds the extracted-size limit.");
    if (localOffset + 30 > file.size) throw new Error("ZIP local header offset is invalid.");
    entries.push({ originalPath: normalized, path: normalized, flags, method, crc, compressedSize, size, localOffset, externalAttributes });
  }
  if (recordCount !== totalEntries || offset !== bytes.length) throw new Error("ZIP central directory is malformed.");
  if (entries.length === 0) throw new Error("ZIP contains no extractable files.");
  return entries;
}

async function extractEntry(file: File, entry: CentralEntry) {
  const fixed = new Uint8Array(await file.slice(entry.localOffset, entry.localOffset + 30).arrayBuffer());
  if (fixed.length !== 30 || readU32(fixed, 0) !== 0x04034b50) throw new Error(`ZIP local header is invalid: ${entry.path}`);
  const view = new DataView(fixed.buffer, fixed.byteOffset, fixed.byteLength);
  const flags = view.getUint16(6, true);
  const method = view.getUint16(8, true);
  const localCrc = view.getUint32(14, true);
  const localCompressed = view.getUint32(18, true);
  const localSize = view.getUint32(22, true);
  const nameLength = view.getUint16(26, true);
  const extraLength = view.getUint16(28, true);
  if (flags !== entry.flags || method !== entry.method) throw new Error(`ZIP local/central header mismatch: ${entry.path}`);
  if (!(flags & 8) && (localCrc !== entry.crc || localCompressed !== entry.compressedSize || localSize !== entry.size)) {
    throw new Error(`ZIP local/central size mismatch: ${entry.path}`);
  }
  const variable = new Uint8Array(await file.slice(entry.localOffset + 30, entry.localOffset + 30 + nameLength).arrayBuffer());
  if (decodeName(variable, flags) !== entry.originalPath) throw new Error(`ZIP local/central name mismatch: ${entry.path}`);
  const start = entry.localOffset + 30 + nameLength + extraLength;
  const end = start + entry.compressedSize;
  if (end > file.size) throw new Error(`ZIP entry is truncated: ${entry.path}`);
  const compressed = file.slice(start, end);
  const blob = entry.method === 0
    ? compressed
    : await new Response(compressed.stream().pipeThrough(new DecompressionStream("deflate-raw" as CompressionFormat))).blob();
  if (blob.size !== entry.size) throw new Error(`ZIP extracted size mismatch: ${entry.path}`);
  return blob;
}

function hostingMetadata(path: string): Pick<WebglManifestEntry, "contentType" | "contentEncoding" | "cacheControl"> {
  const lower = path.toLowerCase();
  const contentEncoding = lower.endsWith(".br") ? "br" as const : lower.endsWith(".gz") ? "gzip" as const : undefined;
  const base = contentEncoding ? lower.replace(/\.(?:br|gz)$/, "") : lower;
  const extension = base.split(".").pop() || "";
  const contentType = ({
    html: "text/html; charset=utf-8", js: "text/javascript; charset=utf-8", mjs: "text/javascript; charset=utf-8",
    css: "text/css; charset=utf-8", json: "application/json", wasm: "application/wasm", data: "application/octet-stream",
    unityweb: "application/octet-stream", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp",
    svg: "image/svg+xml", ico: "image/x-icon", mp3: "audio/mpeg", ogg: "audio/ogg", wav: "audio/wav"
  } as Record<string, string>)[extension] || "application/octet-stream";
  return {
    contentType,
    ...(contentEncoding ? { contentEncoding } : {}),
    cacheControl: extension === "html" ? "no-cache, no-store, must-revalidate" : "public, max-age=31536000, immutable"
  };
}

function decodeName(bytes: Uint8Array, flags: number) {
  if (!(flags & 0x800) && bytes.some((byte) => byte > 0x7f)) throw new Error("ZIP filenames must be UTF-8 or ASCII.");
  try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { throw new Error("ZIP contains an invalid filename encoding."); }
}

function readU32(bytes: Uint8Array, offset: number) {
  if (offset < 0 || offset + 4 > bytes.length) return -1;
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, true);
}
function fileName(path: string) { return path.slice(path.lastIndexOf("/") + 1); }
function hex(value: ArrayBuffer) { return [...new Uint8Array(value)].map((byte) => byte.toString(16).padStart(2, "0")).join(""); }

const crcTable = new Uint32Array(256).map((_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function updateCrc32(current:number,bytes:Uint8Array) {
  let value=current;
  for (const byte of bytes) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  return value;
}
async function hashBlob(blob:Blob,sessionId:string) {
  const hash=new IncrementalSha256();
  let value = 0xffffffff;
  const reader=blob.stream().getReader();
  try {
    while(true) {
      if(cancelled.has(sessionId))throw new Error("ZIP processing was cancelled.");
      const {done,value:chunk}=await reader.read();
      if(done)break;
      hash.update(chunk);value=updateCrc32(value,chunk);
    }
  } finally {reader.releaseLock();}
  return {crc32:(value^0xffffffff)>>>0,sha256:hash.digestHex()};
}

async function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(storeName, { keyPath: "id" });
      store.createIndex("session", "session", { unique: false });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Browser extraction storage is unavailable."));
  });
}
async function storeBlob(session: string, path: string, blob: Blob) {
  const db = await openDatabase();
  await transactionPromise(db, "readwrite", (store) => store.put({ id: `${session}\0${path}`, session, path, blob }));
  db.close();
}
async function readStoredBlob(session: string, path: string) {
  const db = await openDatabase();
  const result = await transactionPromise<{ blob: Blob } | undefined>(db, "readonly", (store) => store.get(`${session}\0${path}`));
  db.close();
  return result?.blob;
}
async function clearSession(session: string) {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const cursor = transaction.objectStore(storeName).index("session").openCursor(IDBKeyRange.only(session));
    cursor.onsuccess = () => { const current = cursor.result; if (current) { current.delete(); current.continue(); } };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error("Unable to clear browser extraction storage."));
  });
  db.close();
}
function transactionPromise<T>(db: IDBDatabase, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    const request = action(db.transaction(storeName, mode).objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Browser extraction storage operation failed."));
  });
}

export {};
