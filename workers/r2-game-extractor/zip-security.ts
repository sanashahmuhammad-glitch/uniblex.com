import { Unzip, UnzipInflate, unzipSync } from "fflate";

export type ZipSecurityLimits = {
  maxCompressedBytes: number;
  maxExtractedBytes: number;
  maxIndividualFileBytes: number;
  maxFileCount: number;
  maxDirectoryDepth: number;
  maxPathLength: number;
  maxCompressionRatio: number;
};

export const DEFAULT_ZIP_SECURITY_LIMITS: ZipSecurityLimits = {
  maxCompressedBytes: 64 * 1024 * 1024,
  maxExtractedBytes: 512 * 1024 * 1024,
  maxIndividualFileBytes: 256 * 1024 * 1024,
  maxFileCount: 2_000,
  maxDirectoryDepth: 16,
  maxPathLength: 240,
  maxCompressionRatio: 100
};

export type ValidatedZipEntry = {
  archivePath: string;
  compressedSize: number;
  uncompressedSize: number;
  directory: boolean;
};

export class ZipSecurityError extends Error {}

export type ZipDirectoryLocator = { centralOffset: number; centralSize: number; entryCount: number };

export function locateZipCentralDirectory(tail: Uint8Array, objectSize: number): ZipDirectoryLocator {
  const tailOffset = objectSize - tail.byteLength;
  const view = new DataView(tail.buffer, tail.byteOffset, tail.byteLength);
  const eocdOffset = findEndOfCentralDirectory(view);
  if (tailOffset + eocdOffset + 22 + u16(view, eocdOffset + 20) !== objectSize) throw new ZipSecurityError("ZIP end record is inconsistent.");
  const entryCount = u16(view, eocdOffset + 10);
  const centralSize = u32(view, eocdOffset + 12);
  const centralOffset = u32(view, eocdOffset + 16);
  if (u16(view, eocdOffset + 4) || u16(view, eocdOffset + 6) || u16(view, eocdOffset + 8) !== entryCount || entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) throw new ZipSecurityError("Multi-disk and ZIP64 archives are not supported.");
  if (centralSize > 1024 * 1024 || centralOffset + centralSize > tailOffset + eocdOffset) throw new ZipSecurityError("ZIP central directory is invalid or too large.");
  return { centralOffset, centralSize, entryCount };
}

export function validateZipCentralDirectory(bytes: Uint8Array, locator: ZipDirectoryLocator, compressedBytes: number, overrides: Partial<ZipSecurityLimits> = {}) {
  const limits = { ...DEFAULT_ZIP_SECURITY_LIMITS, ...overrides };
  if (compressedBytes <= 0 || compressedBytes > limits.maxCompressedBytes || bytes.byteLength !== locator.centralSize) throw new ZipSecurityError("ZIP compressed size or directory is invalid.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries: ValidatedZipEntry[] = [];
  const paths = new Set<string>();
  let cursor = 0;
  let extractedBytes = 0;
  let fileCount = 0;
  for (let index = 0; index < locator.entryCount; index += 1) {
    requireRange(view, cursor, 46);
    if (u32(view, cursor) !== 0x02014b50) throw new ZipSecurityError("ZIP central directory is malformed.");
    const flags = u16(view, cursor + 8);
    const method = u16(view, cursor + 10);
    const compressedSize = u32(view, cursor + 20);
    const uncompressedSize = u32(view, cursor + 24);
    const nameLength = u16(view, cursor + 28);
    const extraLength = u16(view, cursor + 30);
    const commentLength = u16(view, cursor + 32);
    const externalAttributes = u32(view, cursor + 38);
    requireRange(view, cursor + 46, nameLength + extraLength + commentLength);
    const rawPath = decodeName(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    const archivePath = validateArchivePath(rawPath, limits);
    const directory = rawPath.endsWith("/") || rawPath.endsWith("\\");
    if (flags & 1) throw new ZipSecurityError("Encrypted ZIP entries are not supported.");
    if (method !== 0 && method !== 8) throw new ZipSecurityError("ZIP uses an unsupported compression method.");
    if (((externalAttributes >>> 16) & 0xf000) === 0xa000) throw new ZipSecurityError("Symbolic links are not allowed in game archives.");
    if (isNestedArchive(archivePath)) throw new ZipSecurityError("Nested archives are not allowed in game archives.");
    const collisionKey = archivePath.toLocaleLowerCase("en-US");
    if (paths.has(collisionKey)) throw new ZipSecurityError("ZIP contains duplicate normalized paths.");
    paths.add(collisionKey);
    if (!directory) {
      fileCount += 1;
      extractedBytes += uncompressedSize;
      if (fileCount > limits.maxFileCount) throw new ZipSecurityError("ZIP contains too many files.");
      if (uncompressedSize > limits.maxIndividualFileBytes) throw new ZipSecurityError("ZIP contains a file that exceeds the configured limit.");
      if (extractedBytes > limits.maxExtractedBytes) throw new ZipSecurityError("ZIP extracted size exceeds the configured limit.");
      if (uncompressedSize > 0 && (compressedSize === 0 || uncompressedSize / compressedSize > limits.maxCompressionRatio)) throw new ZipSecurityError("ZIP compression ratio exceeds the configured limit.");
    }
    entries.push({ archivePath, compressedSize, uncompressedSize, directory });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  if (cursor !== bytes.byteLength) throw new ZipSecurityError("ZIP central directory size is inconsistent.");
  return { entries, compressedBytes, extractedBytes, fileCount };
}

export async function streamValidatedZip(source: ReadableStream<Uint8Array>, validation: ReturnType<typeof validateZipCentralDirectory>, onFile: (entry: ValidatedZipEntry, body: ReadableStream<Uint8Array>) => Promise<unknown>) {
  const expected = new Map(validation.entries.filter((entry) => !entry.directory).map((entry) => [entry.archivePath, entry]));
  const active = new Set<{ writes: Promise<void>; done: Promise<unknown>; received: number }>();
  let streamError: Error | undefined;
  const unzip = new Unzip((file) => {
    const archivePath = validateArchivePath(file.name);
    const entry = expected.get(archivePath);
    if (!entry) { streamError = new ZipSecurityError("ZIP stream contains an unexpected file."); file.start(); return; }
    expected.delete(archivePath);
    const channel = new TransformStream<Uint8Array, Uint8Array>();
    const writer = channel.writable.getWriter();
    const done = Promise.resolve(onFile(entry, channel.readable));
    const state = { writes: Promise.resolve(), done, received: 0 };
    done.catch((error) => { streamError = error instanceof Error ? error : new Error("Extraction sink failed."); void writer.abort(error).catch(() => undefined); });
    active.add(state);
    file.ondata = (error, chunk, final) => {
      if (error) { streamError = error; return; }
      state.received += chunk.byteLength;
      if (state.received > entry.uncompressedSize) { streamError = new ZipSecurityError("ZIP stream exceeded its declared file size."); return; }
      state.writes = state.writes.then(() => writer.write(chunk.slice()));
      if (final) state.writes = state.writes.then(() => writer.close());
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  const reader = source.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      unzip.push(value || new Uint8Array(), done);
      await Promise.all([...active].map((state) => state.writes));
      if (streamError) throw streamError;
      if (done) break;
    }
    await Promise.all([...active].map(async (state) => { await state.writes; await state.done; }));
    if (expected.size) throw new ZipSecurityError("ZIP stream did not produce every validated file.");
  } finally {
    reader.releaseLock();
  }
}

export function validateZipArchive(bytes: Uint8Array, overrides: Partial<ZipSecurityLimits> = {}) {
  const limits = { ...DEFAULT_ZIP_SECURITY_LIMITS, ...overrides };
  if (!bytes.byteLength || bytes.byteLength > limits.maxCompressedBytes) {
    throw new ZipSecurityError("ZIP compressed size is invalid or exceeds the configured limit.");
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocdOffset = findEndOfCentralDirectory(view);
  const disk = u16(view, eocdOffset + 4);
  const centralDisk = u16(view, eocdOffset + 6);
  const diskEntries = u16(view, eocdOffset + 8);
  const entryCount = u16(view, eocdOffset + 10);
  const centralSize = u32(view, eocdOffset + 12);
  const centralOffset = u32(view, eocdOffset + 16);
  if (disk || centralDisk || diskEntries !== entryCount || entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    throw new ZipSecurityError("Multi-disk and ZIP64 archives are not supported.");
  }
  if (centralOffset + centralSize > eocdOffset) throw new ZipSecurityError("ZIP central directory is malformed.");

  const entries: ValidatedZipEntry[] = [];
  const paths = new Set<string>();
  let cursor = centralOffset;
  let totalExtractedBytes = 0;
  let fileCount = 0;

  for (let index = 0; index < entryCount; index += 1) {
    requireRange(view, cursor, 46);
    if (u32(view, cursor) !== 0x02014b50) throw new ZipSecurityError("ZIP central directory is malformed.");
    const flags = u16(view, cursor + 8);
    const method = u16(view, cursor + 10);
    const compressedSize = u32(view, cursor + 20);
    const uncompressedSize = u32(view, cursor + 24);
    const nameLength = u16(view, cursor + 28);
    const extraLength = u16(view, cursor + 30);
    const commentLength = u16(view, cursor + 32);
    const externalAttributes = u32(view, cursor + 38);
    const localOffset = u32(view, cursor + 42);
    requireRange(view, cursor + 46, nameLength + extraLength + commentLength);
    const rawPath = decodeName(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    const archivePath = validateArchivePath(rawPath, limits);
    const directory = rawPath.endsWith("/") || rawPath.endsWith("\\");

    if (flags & 0x1) throw new ZipSecurityError("Encrypted ZIP entries are not supported.");
    if (method !== 0 && method !== 8) throw new ZipSecurityError("ZIP uses an unsupported compression method.");
    if (((externalAttributes >>> 16) & 0xf000) === 0xa000) throw new ZipSecurityError("Symbolic links are not allowed in game archives.");
    if (isNestedArchive(archivePath)) throw new ZipSecurityError("Nested archives are not allowed in game archives.");

    const collisionKey = archivePath.toLocaleLowerCase("en-US");
    if (paths.has(collisionKey)) throw new ZipSecurityError("ZIP contains duplicate normalized paths.");
    paths.add(collisionKey);

    if (!directory) {
      fileCount += 1;
      totalExtractedBytes += uncompressedSize;
      if (fileCount > limits.maxFileCount) throw new ZipSecurityError("ZIP contains too many files.");
      if (uncompressedSize > limits.maxIndividualFileBytes) throw new ZipSecurityError("ZIP contains a file that exceeds the configured limit.");
      if (totalExtractedBytes > limits.maxExtractedBytes) throw new ZipSecurityError("ZIP extracted size exceeds the configured limit.");
      if (uncompressedSize > 0 && (compressedSize === 0 || uncompressedSize / compressedSize > limits.maxCompressionRatio)) {
        throw new ZipSecurityError("ZIP compression ratio exceeds the configured limit.");
      }
    }

    validateLocalHeader(view, bytes, localOffset, archivePath, flags, method);
    entries.push({ archivePath, compressedSize, uncompressedSize, directory });
    cursor += 46 + nameLength + extraLength + commentLength;
  }

  if (cursor !== centralOffset + centralSize) throw new ZipSecurityError("ZIP central directory size is inconsistent.");
  return { entries, compressedBytes: bytes.byteLength, extractedBytes: totalExtractedBytes, fileCount };
}

export function extractValidatedZip(bytes: Uint8Array, overrides: Partial<ZipSecurityLimits> = {}) {
  const validation = validateZipArchive(bytes, overrides);
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new ZipSecurityError("ZIP archive is malformed or could not be decompressed.");
  }

  const expected = new Map(validation.entries.filter((entry) => !entry.directory).map((entry) => [entry.archivePath, entry]));
  const extracted = Object.entries(files)
    .filter(([path]) => !path.endsWith("/") && !path.endsWith("\\"))
    .map(([path, fileBytes]) => {
      const archivePath = validateArchivePath(path, { ...DEFAULT_ZIP_SECURITY_LIMITS, ...overrides });
      const metadata = expected.get(archivePath);
      if (!metadata || metadata.uncompressedSize !== fileBytes.byteLength) {
        throw new ZipSecurityError("ZIP extraction did not match its validated directory.");
      }
      expected.delete(archivePath);
      return { path: archivePath, bytes: fileBytes };
    });
  if (expected.size) throw new ZipSecurityError("ZIP extraction did not produce every validated file.");
  return { ...validation, files: extracted };
}

export function validateArchivePath(rawPath: string, limits: ZipSecurityLimits = DEFAULT_ZIP_SECURITY_LIMITS) {
  if (!rawPath || rawPath.includes("\0") || rawPath.length > limits.maxPathLength) throw new ZipSecurityError("ZIP contains an invalid path.");
  if (/^[a-zA-Z]:/.test(rawPath) || rawPath.startsWith("/") || rawPath.startsWith("\\")) {
    throw new ZipSecurityError("Absolute paths are not allowed in game archives.");
  }
  const normalized = rawPath.replace(/\\/g, "/").replace(/\/+$/, "");
  const parts = normalized.split("/");
  if (!parts.length || parts.some((part) => !part || part === "." || part === "..")) {
    throw new ZipSecurityError("Path traversal is not allowed in game archives.");
  }
  if (parts.length - 1 > limits.maxDirectoryDepth) throw new ZipSecurityError("ZIP directory depth exceeds the configured limit.");
  return parts.join("/");
}

function findEndOfCentralDirectory(view: DataView) {
  const minimum = Math.max(0, view.byteLength - 65_557);
  for (let offset = view.byteLength - 22; offset >= minimum; offset -= 1) {
    if (u32(view, offset) === 0x06054b50) {
      const commentLength = u16(view, offset + 20);
      if (offset + 22 + commentLength === view.byteLength) return offset;
    }
  }
  throw new ZipSecurityError("ZIP end-of-central-directory record was not found.");
}

function validateLocalHeader(view: DataView, bytes: Uint8Array, offset: number, path: string, flags: number, method: number) {
  requireRange(view, offset, 30);
  if (u32(view, offset) !== 0x04034b50) throw new ZipSecurityError("ZIP local file header is malformed.");
  const localFlags = u16(view, offset + 6);
  const localMethod = u16(view, offset + 8);
  const nameLength = u16(view, offset + 26);
  const extraLength = u16(view, offset + 28);
  requireRange(view, offset + 30, nameLength + extraLength);
  const localPath = decodeName(bytes.subarray(offset + 30, offset + 30 + nameLength));
  if (validateArchivePath(localPath) !== path || localFlags !== flags || localMethod !== method) {
    throw new ZipSecurityError("ZIP local and central directory headers do not match.");
  }
}

function decodeName(value: Uint8Array) {
  try {
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(value);
  } catch {
    throw new ZipSecurityError("ZIP paths must be valid UTF-8.");
  }
}

function isNestedArchive(path: string) {
  const lower = path.toLowerCase();
  return [".zip", ".rar", ".7z", ".tar", ".tgz", ".tar.gz"].some((suffix) => lower.endsWith(suffix));
}

function requireRange(view: DataView, offset: number, length: number) {
  if (!Number.isSafeInteger(offset) || offset < 0 || length < 0 || offset + length > view.byteLength) {
    throw new ZipSecurityError("ZIP structure points outside the archive.");
  }
}

function u16(view: DataView, offset: number) {
  requireRange(view, offset, 2);
  return view.getUint16(offset, true);
}

function u32(view: DataView, offset: number) {
  requireRange(view, offset, 4);
  return view.getUint32(offset, true);
}
