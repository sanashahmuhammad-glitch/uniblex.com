export const WEBGL_MVP_LIMITS = {
  maxZipBytes: 1024 * 1024 * 1024,
  maxExtractedBytes: 4 * 1024 * 1024 * 1024,
  maxFileBytes: 512 * 1024 * 1024,
  maxFiles: 5000,
  maxPathLength: 512,
  maxDepth: 20,
  maxCompressionRatio: 200,
  maxSigningBatch: 20,
  verificationBatch: 25
} as const;

export type WebglBuildType = "unity-uncompressed" | "unity-brotli" | "unity-gzip" | "unity-unityweb" | "html5";
export type WebglCompressionMode = "none" | "brotli" | "gzip" | "unityweb" | "mixed-generic";

export type WebglManifestEntry = {
  path: string;
  size: number;
  sha256: string;
  crc32: string;
  contentType: string;
  contentEncoding?: "br" | "gzip";
  cacheControl: string;
};

export type WebglManifest = {
  schemaVersion: 1;
  entryPath: "index.html";
  buildType: WebglBuildType;
  compressionMode: WebglCompressionMode;
  requiredPaths: string[];
  totalBytes: number;
  files: WebglManifestEntry[];
};

const archiveSuffix = /\.(zip|7z|rar|tar|tgz|bz2|xz)$/i;
const drivePath = /^[A-Za-z]:/;
const sha256Pattern = /^[a-f0-9]{64}$/;
const crc32Pattern = /^[a-f0-9]{8}$/;
const allowedBuildTypes = new Set<WebglBuildType>(["unity-uncompressed", "unity-brotli", "unity-gzip", "unity-unityweb", "html5"]);
const allowedCompressionModes = new Set<WebglCompressionMode>(["none", "brotli", "gzip", "unityweb", "mixed-generic"]);

export function normalizeWebglPath(value: string) {
  if (/[\u0000-\u001f\u007f]/.test(value)) throw new Error("ZIP path contains an unsafe control character.");
  if (value.normalize("NFC") !== value) throw new Error("ZIP paths must use normalized Unicode.");
  if (!value || value.includes("\0") || value.includes("\\") || value.startsWith("/") || drivePath.test(value)) {
    throw new Error("ZIP contains an unsafe path.");
  }
  if (value.length > WEBGL_MVP_LIMITS.maxPathLength) throw new Error("ZIP path is too long.");
  const parts = value.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) throw new Error("ZIP contains path traversal.");
  if (parts.length > WEBGL_MVP_LIMITS.maxDepth) throw new Error("ZIP path is too deep.");
  const normalized = parts.join("/");
  if (archiveSuffix.test(normalized)) throw new Error("Nested archives are not allowed.");
  return normalized;
}

export function validateWebglManifest(value: unknown): WebglManifest {
  if (!value || typeof value !== "object") throw new Error("Build manifest is missing.");
  const manifest = value as Partial<WebglManifest>;
  if (manifest.schemaVersion !== 1 || manifest.entryPath !== "index.html") throw new Error("Build manifest entry point is invalid.");
  if (!allowedBuildTypes.has(manifest.buildType as WebglBuildType)) throw new Error("Detected build type is invalid.");
  if (!allowedCompressionModes.has(manifest.compressionMode as WebglCompressionMode)) throw new Error("Detected compression mode is invalid.");
  if (!Array.isArray(manifest.files) || !manifest.files.length || manifest.files.length > WEBGL_MVP_LIMITS.maxFiles) {
    throw new Error("Build manifest file count is invalid.");
  }
  const seen = new Set<string>();
  let total = 0;
  let previous = "";
  for (const file of manifest.files) {
    const path = normalizeWebglPath(String(file.path ?? ""));
    const folded = path.toLocaleLowerCase("en-US");
    if (seen.has(folded)) throw new Error("Build manifest contains duplicate paths.");
    if (previous && previous.localeCompare(path) > 0) throw new Error("Build manifest must be deterministically sorted.");
    seen.add(folded);
    previous = path;
    if (!Number.isSafeInteger(file.size) || file.size < 0 || file.size > WEBGL_MVP_LIMITS.maxFileBytes) throw new Error(`Build file size is invalid: ${path}`);
    if (!sha256Pattern.test(String(file.sha256 ?? "")) || !crc32Pattern.test(String(file.crc32 ?? ""))) throw new Error(`Build checksum is invalid: ${path}`);
    if (!file.contentType || file.contentType.length > 150 || !file.cacheControl || file.cacheControl.length > 150) throw new Error(`Build hosting metadata is invalid: ${path}`);
    if (file.contentEncoding && file.contentEncoding !== "br" && file.contentEncoding !== "gzip") throw new Error(`Build content encoding is invalid: ${path}`);
    total += file.size;
    if (total > WEBGL_MVP_LIMITS.maxExtractedBytes) throw new Error("Build exceeds the extracted-size limit.");
  }
  if (!seen.has("index.html")) throw new Error("Build manifest is missing index.html.");
  if (manifest.totalBytes !== total) throw new Error("Build manifest byte total does not match its files.");
  if (!Array.isArray(manifest.requiredPaths) || manifest.requiredPaths.some((path) => !seen.has(normalizeWebglPath(path).toLocaleLowerCase("en-US")))) {
    throw new Error("Build manifest is missing a required referenced file.");
  }
  return manifest as WebglManifest;
}

export function stableManifestJson(manifest: WebglManifest) {
  return JSON.stringify({
    schemaVersion: manifest.schemaVersion,
    entryPath: manifest.entryPath,
    buildType: manifest.buildType,
    compressionMode: manifest.compressionMode,
    requiredPaths: [...manifest.requiredPaths].sort(),
    totalBytes: manifest.totalBytes,
    files: manifest.files.map((file) => ({
      path: file.path, size: file.size, sha256: file.sha256, crc32: file.crc32,
      contentType: file.contentType, ...(file.contentEncoding ? { contentEncoding: file.contentEncoding } : {}),
      cacheControl: file.cacheControl
    }))
  });
}

export function publicObjectUrl(baseUrl: string, key: string) {
  return `${baseUrl.replace(/\/+$/, "")}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export function webglPublicBaseUrl(environment: NodeJS.ProcessEnv, fallbackBaseUrl: string) {
  const configured = environment.R2_WEBGL_PUBLIC_BASE_URL?.trim();
  const baseUrl = (configured || fallbackBaseUrl).replace(/\/+$/, "");
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("WebGL public asset URL is invalid.");
  }
  return baseUrl;
}
