import { createHash, createHmac } from "crypto";

export type R2MvpConfig = {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
};

export type MvpHeadObject = {
  exists: boolean;
  status: number;
  size: number | null;
  sha256: string;
  checksumSha256: string;
};

export type MvpHeadMismatch =
  | "head_status"
  | "missing_size"
  | "missing_metadata"
  | "missing_checksum"
  | "size_mismatch"
  | "checksum_mismatch"
  | null;

const region = "auto";
const service = "s3";
const unsignedPayload = "UNSIGNED-PAYLOAD";

export function getR2MvpConfig(environment: NodeJS.ProcessEnv = process.env): R2MvpConfig {

  const config = {
    accountId: readEnv(environment, "R2_ACCOUNT_ID", "CLOUDFLARE_R2_ACCOUNT_ID"),
    bucket: readEnv(environment, "R2_BUCKET", "CLOUDFLARE_R2_BUCKET"),
    accessKeyId: readEnv(environment, "R2_ACCESS_KEY_ID", "CLOUDFLARE_R2_ACCESS_KEY_ID"),
    secretAccessKey: readEnv(environment, "R2_SECRET_ACCESS_KEY", "CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
    publicBaseUrl: readEnv(environment, "R2_PUBLIC_BASE_URL", "NEXT_PUBLIC_R2_PUBLIC_BASE_URL").replace(/\/+$/, "")
  };
  if (Object.values(config).some((value) => !value)) throw new Error("R2 upload storage is not configured.");
  return config;
}

export function assertMvpOperationPrefix(prefix: string, operationId: string) {
  const expected = `staging-webgl-uploads/${operationId}/`;
  if (prefix !== expected) throw new Error("Upload operation storage binding is invalid.");
  return expected;
}

export function sha256HexToBase64(value: string) {
  if (!/^[a-f0-9]{64}$/.test(value)) throw new Error("SHA-256 checksum is invalid.");
  return Buffer.from(value, "hex").toString("base64");
}

export function presignMvpPut(
  config: R2MvpConfig,
  key: string,
  headers: Record<string, string>,
  expiresSeconds = 600
) {
  if (expiresSeconds < 60 || expiresSeconds > 900) throw new Error("Signed upload expiry is invalid.");
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const normalizedHeaders = normalizeHeaders({ host, ...headers });
  const canonicalSignedHeaders = Object.fromEntries(
    Object.entries(normalizedHeaders).filter(([name]) => name !== "content-type")
  );
  const signedHeaders = Object.keys(canonicalSignedHeaders).sort().join(";");
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const query: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${config.accessKeyId}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresSeconds),
    "X-Amz-SignedHeaders": signedHeaders
  };
  const request = ["PUT", canonicalUri(config.bucket, key), canonicalQuery(query), canonicalHeaders(canonicalSignedHeaders), signedHeaders, unsignedPayload].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(request)].join("\n");
  query["X-Amz-Signature"] = hmacHex(signingKey(config.secretAccessKey, dateStamp), stringToSign);
  return `https://${host}${canonicalUri(config.bucket, key)}?${canonicalQuery(query)}`;
}

export async function headMvpObject(config: R2MvpConfig, key: string) {
  const response = await signedRequest(config, "HEAD", key, {});
  return parseMvpHeadResponse(response);
}

export function headR2ObjectResponse(config: R2MvpConfig, key: string) {
  return signedRequest(config, "HEAD", key, {}, { "x-amz-checksum-mode": "ENABLED" });
}

export function parseMvpHeadResponse(response: Pick<Response, "ok" | "status" | "headers">): MvpHeadObject {
  if (!response.ok) {
    return { exists: false, status: response.status, size: null, sha256: "", checksumSha256: "" };
  }
  const sizeHeader = response.headers.get("content-length") ?? response.headers.get("x-amz-meta-size-bytes");
  const parsedSize = sizeHeader === null ? null : Number(sizeHeader);
  return {
    exists: true,
    status: response.status,
    size: parsedSize !== null && Number.isSafeInteger(parsedSize) && parsedSize >= 0 ? parsedSize : null,
    sha256: normalizeSha256Hex(response.headers.get("x-amz-meta-sha256")),
    checksumSha256: decodeSha256Base64(response.headers.get("x-amz-checksum-sha256"))
  };
}

export function getMvpHeadMismatch(expected: { size: number; sha256: string }, actual: MvpHeadObject): MvpHeadMismatch {
  if (!actual.exists || actual.status < 200 || actual.status >= 300) return "head_status";
  if (actual.size === null) return "missing_size";
  if (!actual.sha256) return "missing_metadata";
  if (!actual.checksumSha256) return "missing_checksum";
  if (actual.size !== expected.size) return "size_mismatch";
  if (actual.sha256 !== expected.sha256 || actual.checksumSha256 !== expected.sha256) return "checksum_mismatch";
  return null;
}

export async function listMvpPrefix(config: R2MvpConfig, prefix: string, maxKeys = 5001) {
  const keys: string[] = [];
  let continuation = "";
  do {
    const query: Record<string, string> = { "list-type": "2", prefix, "max-keys": "1000" };
    if (continuation) query["continuation-token"] = continuation;
    const response = await signedRequest(config, "GET", "", query);
    if (!response.ok) throw new Error("Unable to inspect upload objects.");
    const xml = await response.text();
    for (const match of xml.matchAll(/<Key>([\s\S]*?)<\/Key>/g)) {
      const key = decodeXml(match[1]);
      if (!key.startsWith(prefix)) throw new Error("R2 returned an object outside the upload prefix.");
      keys.push(key);
      if (keys.length > maxKeys) throw new Error("Upload prefix contains too many objects.");
    }
    continuation = decodeXml(xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/)?.[1] || "");
  } while (continuation);
  return keys;
}

export async function deleteMvpObject(config: R2MvpConfig, key: string) {
  const response = await signedRequest(config, "DELETE", key, {});
  if (!response.ok && response.status !== 404) {
    console.error("R2 object cleanup failed.", {
      status: response.status,
      code: await readR2ErrorCode(response)
    });
    throw new Error("Unable to remove an incomplete upload object.");
  }
}

async function signedRequest(config: R2MvpConfig, method: string, key: string, query: Record<string, string>, extraHeaders: Record<string, string> = {}) {
  const { AwsClient } = await import("aws4fetch");
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service,
    region,
    retries: 0
  });
  return client.fetch(`https://${host}${canonicalUri(config.bucket, key)}?${canonicalQuery(query)}`, {
    method,
    headers: extraHeaders,
    cache: "no-store"
  });
}

function readEnv(environment: NodeJS.ProcessEnv, ...names: string[]) {
  for (const name of names) {
    const value = environment[name]?.trim();
    if (value) return value;
  }
  return "";
}

function normalizeSha256Hex(value: string | null) {
  const normalized = value?.trim().toLowerCase() || "";
  return /^[a-f0-9]{64}$/.test(normalized) ? normalized : "";
}

function decodeSha256Base64(value: string | null) {
  if (!value) return "";
  try {
    const decoded = Buffer.from(value.trim(), "base64");
    return decoded.length === 32 ? decoded.toString("hex") : "";
  } catch {
    return "";
  }
}

function normalizeHeaders(headers: Record<string, string>) {
  return Object.fromEntries(Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value.trim()]));
}
function canonicalHeaders(headers: Record<string, string>) {
  return Object.entries(headers).sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => `${name}:${value}\n`).join("");
}
function canonicalUri(bucket: string, key: string) {
  const path = [bucket, ...key.split("/").filter(Boolean)].map(awsEncode).join("/");
  return `/${path}${key.endsWith("/") ? "/" : ""}`;
}
function canonicalQuery(query: Record<string, string>) {
  return Object.entries(query).sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => `${awsEncode(name)}=${awsEncode(value)}`).join("&");
}
function awsEncode(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}
function toAmzDate(date: Date) { return date.toISOString().replace(/[:-]|\.\d{3}/g, ""); }
function sha256(value: string) { return createHash("sha256").update(value).digest("hex"); }
function hmac(key: Buffer | string, value: string) { return createHmac("sha256", key).update(value).digest(); }
function hmacHex(key: Buffer, value: string) { return createHmac("sha256", key).update(value).digest("hex"); }
function signingKey(secret: string, stamp: string) {
  return hmac(hmac(hmac(hmac(`AWS4${secret}`, stamp), region), service), "aws4_request");
}
function decodeXml(value: string) {
  return value.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

async function readR2ErrorCode(response: Response) {
  try {
    const xml = await response.text();
    return decodeXml(xml.match(/<Code>([^<]+)<\/Code>/)?.[1] || "UnknownR2Error").slice(0, 80);
  } catch {
    return "UnreadableR2Error";
  }
}
