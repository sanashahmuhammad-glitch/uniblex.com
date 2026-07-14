import { createBuildPlan, validateBuildReferences } from "./r2-game-extractor/build-detection";
import {
  locateZipCentralDirectory,
  streamValidatedZip,
  validateArchivePath,
  validateZipCentralDirectory,
  ZipSecurityError
} from "./r2-game-extractor/zip-security";

type Env = { GAME_BUILDS_BUCKET: R2Bucket; EXTRACT_WORKER_SECRET: string; PUBLIC_R2_BASE_URL: string };

export default {
  async fetch(request: Request, env: Env) {
    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
    if (request.headers.get("authorization") !== `Bearer ${env.EXTRACT_WORKER_SECRET}`) return json({ error: "Unauthorized." }, 401);
    const url = new URL(request.url);
    if (url.pathname.endsWith("/cleanup")) return cleanup(request, env);

    const body: Record<string, unknown> = await request.json<Record<string, unknown>>().catch(() => ({}));
    const zipKey = String(body.zipKey ?? "");
    const extractPrefix = normalizePrefix(String(body.extractPrefix ?? ""));
    const operationId = String(body.operationId ?? "");
    if (!zipKey || !extractPrefix || !/^[0-9a-f-]{36}$/i.test(operationId)) return json({ error: "A valid extraction request is required." }, 400);

    const bucket = env.GAME_BUILDS_BUCKET;
    let wroteTarget = false;
    try {
      const head = await bucket.head(zipKey);
      if (!head) return json({ error: "Uploaded ZIP was not found in R2." }, 404);
      const existing = await bucket.list({ prefix: extractPrefix, limit: 1 });
      if (existing.objects.length) throw new ZipSecurityError("Build target prefix is not empty; cleanup is required before retry.");

      const tailLength = Math.min(head.size, 65_557);
      const tail = await getRange(bucket, zipKey, head.size - tailLength, tailLength);
      const locator = locateZipCentralDirectory(tail, head.size);
      const central = await getRange(bucket, zipKey, locator.centralOffset, locator.centralSize);
      const validation = validateZipCentralDirectory(central, locator, head.size);
      const plan = createBuildPlan(validation.entries);
      const source = await bucket.get(zipKey);
      if (!source) throw new ZipSecurityError("Uploaded ZIP disappeared before extraction.");

      const mapped = new Map(plan.outputEntries.map((entry) => [entry.archivePath, entry.outputPath]));
      const texts: Record<string, string> = {};
      const withUploadSlot = createConcurrencyGate(4);
      wroteTarget = true;
      await streamValidatedZip(source.body, validation, async (entry, fileBody) => withUploadSlot(async () => {
        const outputPath = mapped.get(entry.archivePath);
        if (!outputPath) throw new ZipSecurityError("ZIP stream escaped the selected game root.");
        const key = `${extractPrefix}${outputPath}`;
        if (plan.textPaths.includes(outputPath)) {
          const [uploadBody, inspectionBody] = fileBody.tee();
          const [putResult, text] = await Promise.all([
            bucket.put(key, uploadBody, { httpMetadata: getHttpMetadata(outputPath), customMetadata: getCustomMetadata(outputPath, operationId) }),
            readBoundedText(inspectionBody, 2 * 1024 * 1024)
          ]);
          texts[outputPath] = text;
          return putResult;
        }
        return bucket.put(key, fileBody, { httpMetadata: getHttpMetadata(outputPath), customMetadata: getCustomMetadata(outputPath, operationId) });
      }));

      const references = validateBuildReferences(plan, texts);
      await bucket.delete(zipKey);
      return json({
        ok: true,
        indexUrl: `${env.PUBLIC_R2_BASE_URL.replace(/\/+$/, "")}/${extractPrefix}index.html`,
        fileCount: validation.fileCount,
        requiredAssets: references,
        manifest: {
          operationId,
          buildType: plan.kind,
          compression: plan.compression,
          compressedBytes: validation.compressedBytes,
          extractedBytes: validation.extractedBytes,
          files: plan.outputEntries.map((entry) => ({ path: entry.outputPath, size: entry.uncompressedSize, ...getHttpMetadata(entry.outputPath) }))
        }
      });
    } catch (error) {
      let cleanupResult: { ok: boolean; deleted: number; error?: string } = { ok: true, deleted: 0 };
      if (wroteTarget) cleanupResult = await cleanupPrefix(env.GAME_BUILDS_BUCKET, extractPrefix);
      return json({
        error: error instanceof Error ? error.message : "Unable to extract build.",
        cleanup: cleanupResult,
        cleanupFailed: !cleanupResult.ok
      }, 400);
    }
  }
};

async function getRange(bucket: R2Bucket, key: string, offset: number, length: number) {
  const object = await bucket.get(key, { range: { offset, length } });
  if (!object) throw new ZipSecurityError("ZIP metadata range was not found.");
  return new Uint8Array(await object.arrayBuffer());
}

function normalizePrefix(prefix: string) {
  const trimmed = prefix.trim().replace(/\/+$/, "");
  return trimmed ? `${validateArchivePath(trimmed)}/` : "";
}

async function readBoundedText(stream: ReadableStream<Uint8Array>, maximum: number) {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maximum) throw new ZipSecurityError("Entry-point inspection file exceeds the configured limit.");
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes);
}

function getHttpMetadata(path: string): R2HTTPMetadata {
  const lower = path.toLowerCase();
  return {
    contentType: getContentType(lower),
    contentEncoding: lower.endsWith(".br") ? "br" : lower.endsWith(".gz") ? "gzip" : undefined,
    cacheControl: lower.endsWith("index.html") ? "no-cache, max-age=0" : "public, max-age=31536000, immutable"
  };
}

function getCustomMetadata(path: string, operationId: string) {
  return { "X-Uniblex-Asset": path.toLowerCase().endsWith("index.html") ? "entry" : "game-asset", "X-Uniblex-Extraction": operationId };
}

function getContentType(path: string) {
  const normalized = path.replace(/\.(br|gz)$/i, "");
  if (normalized.endsWith(".html")) return "text/html; charset=utf-8";
  if (normalized.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (normalized.endsWith(".css")) return "text/css; charset=utf-8";
  if (normalized.endsWith(".json")) return "application/json; charset=utf-8";
  if (normalized.endsWith(".wasm")) return "application/wasm";
  if (normalized.endsWith(".data") || normalized.endsWith(".unityweb")) return "application/octet-stream";
  if (normalized.endsWith(".png")) return "image/png";
  if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg")) return "image/jpeg";
  if (normalized.endsWith(".webp")) return "image/webp";
  if (normalized.endsWith(".svg")) return "image/svg+xml";
  if (normalized.endsWith(".mp3")) return "audio/mpeg";
  if (normalized.endsWith(".ogg")) return "audio/ogg";
  if (normalized.endsWith(".wav")) return "audio/wav";
  return "application/octet-stream";
}

async function cleanup(request: Request, env: Env) {
  const body: Record<string, unknown> = await request.json<Record<string, unknown>>().catch(() => ({}));
  const prefix = normalizePrefix(String(body.prefix ?? ""));
  if (!prefix) return json({ ok: true, deleted: 0 });
  const result = await cleanupPrefix(env.GAME_BUILDS_BUCKET, prefix);
  return json(result, result.ok ? 200 : 503);
}

export async function cleanupPrefix(bucket: R2Bucket, prefix: string) {
  let cursor: string | undefined;
  let deleted = 0;
  try {
    do {
      const page = await bucket.list({ prefix, cursor });
      for (let index = 0; index < page.objects.length; index += 100) {
        const batch = page.objects.slice(index, index + 100);
        await Promise.all(batch.map((object) => bucket.delete(object.key)));
        deleted += batch.length;
      }
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
    return { ok: true, deleted };
  } catch {
    return { ok: false, deleted, error: "R2 prefix cleanup failed." };
  }
}

function createConcurrencyGate(limit: number) {
  let active = 0;
  const waiting: Array<() => void> = [];
  return async function withSlot<T>(operation: () => Promise<T>) {
    if (active >= limit) await new Promise<void>((resolve) => waiting.push(resolve));
    active += 1;
    try { return await operation(); }
    finally { active -= 1; waiting.shift()?.(); }
  };
}
function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
}
