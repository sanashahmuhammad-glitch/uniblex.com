import { unzipSync } from "fflate";

type Env = {
  GAME_BUILDS_BUCKET: R2Bucket;
  EXTRACT_WORKER_SECRET: string;
  PUBLIC_R2_BASE_URL: string;
};

const requiredUnityPatterns = [
  /Build\/.+\.loader\.js$/i,
  /Build\/.+\.framework\.js(\.(br|gz))?$/i,
  /Build\/.+\.wasm(\.(br|gz))?$/i,
  /Build\/.+\.data(\.(br|gz))?$/i
];

export default {
  async fetch(request: Request, env: Env) {
    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
    if (request.headers.get("authorization") !== `Bearer ${env.EXTRACT_WORKER_SECRET}`) {
      return json({ error: "Unauthorized." }, 401);
    }

    const url = new URL(request.url);
    if (url.pathname.endsWith("/cleanup")) return cleanup(request, env);

    const body = await request.json<Record<string, string | number>>().catch(() => ({}));
    const zipKey = String(body.zipKey ?? "");
    const extractPrefix = normalizePrefix(String(body.extractPrefix ?? ""));
    const indexUrl = String(body.indexUrl || `${env.PUBLIC_R2_BASE_URL.replace(/\/+$/, "")}/${extractPrefix}index.html`);

    if (!zipKey || !extractPrefix) return json({ error: "zipKey and extractPrefix are required." }, 400);

    const zipObject = await env.GAME_BUILDS_BUCKET.get(zipKey);
    if (!zipObject) return json({ error: "Uploaded ZIP was not found in R2." }, 404);

    try {
      const buffer = new Uint8Array(await zipObject.arrayBuffer());
      const files = unzipSync(buffer);
      const entries = normalizeEntries(files);
      const indexEntry = entries.find((entry) => entry.path.toLowerCase() === "index.html");

      if (!indexEntry) throw new Error("ZIP must contain index.html at the build root or one top-level folder.");
      const requiredAssets = verifyRequiredAssets(entries.map((entry) => entry.path));

      await deletePrefix(env.GAME_BUILDS_BUCKET, extractPrefix);

      await Promise.all(entries.map((entry) => env.GAME_BUILDS_BUCKET.put(`${extractPrefix}${entry.path}`, entry.bytes, {
        httpMetadata: getHttpMetadata(entry.path),
        customMetadata: getCustomMetadata(entry.path)
      })));

      await env.GAME_BUILDS_BUCKET.delete(zipKey);

      return json({
        ok: true,
        indexUrl,
        fileCount: entries.length,
        requiredAssets,
        manifest: {
          extractedAt: new Date().toISOString(),
          files: entries.map((entry) => ({
            path: entry.path,
            size: entry.bytes.byteLength,
            contentType: getHttpMetadata(entry.path).contentType,
            contentEncoding: getHttpMetadata(entry.path).contentEncoding
          }))
        }
      });
    } catch (error) {
      await deletePrefix(env.GAME_BUILDS_BUCKET, extractPrefix);
      return json({ error: error instanceof Error ? error.message : "Unable to extract build." }, 400);
    }
  }
};

function normalizeEntries(files: Record<string, Uint8Array>) {
  const rawEntries = Object.entries(files)
    .map(([path, bytes]) => ({ rawPath: normalizePath(path), bytes }))
    .filter((entry) => entry.rawPath && entry.bytes.byteLength > 0);
  const indexPath = rawEntries.find((entry) => entry.rawPath.split("/").pop()?.toLowerCase() === "index.html")?.rawPath;

  if (!indexPath) throw new Error("ZIP must contain an index.html file.");

  const prefix = indexPath.includes("/") ? indexPath.slice(0, indexPath.lastIndexOf("/") + 1) : "";

  return rawEntries
    .filter((entry) => !prefix || entry.rawPath.startsWith(prefix))
    .map((entry) => ({ path: normalizePath(prefix ? entry.rawPath.slice(prefix.length) : entry.rawPath), bytes: entry.bytes }))
    .filter((entry) => entry.path);
}

function verifyRequiredAssets(paths: string[]) {
  const lowerPaths = paths.map((path) => path.replace(/\\/g, "/"));
  const hasIndex = lowerPaths.some((path) => path.toLowerCase() === "index.html");
  if (!hasIndex) throw new Error("index.html was not found after ZIP normalization.");

  const foundUnity = Object.fromEntries(requiredUnityPatterns.map((pattern) => [String(pattern), lowerPaths.some((path) => pattern.test(path))]));
  const missingUnity = Object.entries(foundUnity).filter(([, found]) => !found).map(([pattern]) => pattern);

  if (missingUnity.length) {
    throw new Error("Unity WebGL build is missing loader, framework, wasm, or data assets.");
  }

  return { indexHtml: hasIndex, unityWebgl: foundUnity };
}

function normalizePath(path: string) {
  const normalized = path.replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = normalized.split("/").filter(Boolean);
  if (!parts.length || parts.some((part) => part === "." || part === "..")) return "";
  return parts.join("/");
}

function normalizePrefix(prefix: string) {
  const path = normalizePath(prefix);
  return path ? `${path.replace(/\/+$/, "")}/` : "";
}

function getHttpMetadata(path: string): R2HTTPMetadata {
  const lower = path.toLowerCase();
  const contentEncoding = lower.endsWith(".br") ? "br" : lower.endsWith(".gz") ? "gzip" : undefined;
  const cacheControl = lower.endsWith("index.html")
    ? "no-cache, max-age=0"
    : "public, max-age=31536000, immutable";

  return {
    contentType: getContentType(lower),
    contentEncoding,
    cacheControl
  };
}

function getCustomMetadata(path: string) {
  const lower = path.toLowerCase();
  return {
    "Access-Control-Allow-Origin": "*",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Uniblex-Asset": lower.endsWith("index.html") ? "entry" : "game-asset"
  };
}

function getContentType(path: string) {
  const normalized = path.replace(/\.(br|gz)$/i, "");
  if (normalized.endsWith(".html")) return "text/html; charset=utf-8";
  if (normalized.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (normalized.endsWith(".css")) return "text/css; charset=utf-8";
  if (normalized.endsWith(".json")) return "application/json; charset=utf-8";
  if (normalized.endsWith(".wasm")) return "application/wasm";
  if (normalized.endsWith(".data")) return "application/octet-stream";
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
  const body = await request.json<Record<string, string>>().catch(() => ({}));
  const prefix = normalizePrefix(String(body.prefix ?? ""));
  if (!prefix) return json({ ok: true, skipped: true });
  await deletePrefix(env.GAME_BUILDS_BUCKET, prefix);
  return json({ ok: true });
}

async function deletePrefix(bucket: R2Bucket, prefix: string) {
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix, cursor });
    await Promise.all(page.objects.map((object) => bucket.delete(object.key)));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
