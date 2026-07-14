import { createHash, createHmac } from "crypto";

export type R2MvpConfig = {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
};

const region = "auto";
const service = "s3";
const unsignedPayload = "UNSIGNED-PAYLOAD";

export function getR2MvpConfig(): R2MvpConfig {
  const config = {
    accountId: readEnv("R2_ACCOUNT_ID", "CLOUDFLARE_R2_ACCOUNT_ID"),
    bucket: readEnv("R2_BUCKET", "CLOUDFLARE_R2_BUCKET"),
    accessKeyId: readEnv("R2_ACCESS_KEY_ID", "CLOUDFLARE_R2_ACCESS_KEY_ID"),
    secretAccessKey: readEnv("R2_SECRET_ACCESS_KEY", "CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
    publicBaseUrl: readEnv("R2_PUBLIC_BASE_URL", "NEXT_PUBLIC_R2_PUBLIC_BASE_URL").replace(/\/+$/, "")
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
  const signedHeaders = Object.keys(normalizedHeaders).sort().join(";");
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const query: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${config.accessKeyId}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresSeconds),
    "X-Amz-SignedHeaders": signedHeaders
  };
  const request = ["PUT", canonicalUri(config.bucket, key), canonicalQuery(query), canonicalHeaders(normalizedHeaders), signedHeaders, unsignedPayload].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(request)].join("\n");
  query["X-Amz-Signature"] = hmacHex(signingKey(config.secretAccessKey, dateStamp), stringToSign);
  return `https://${host}${canonicalUri(config.bucket, key)}?${canonicalQuery(query)}`;
}

export async function headMvpObject(config: R2MvpConfig, key: string) {
  const response = await signedRequest(config, "HEAD", key, {});
  if (!response.ok) return { exists: false, status: response.status, size: 0, sha256: "" };
  return {
    exists: true,
    status: response.status,
    size: Number(response.headers.get("content-length") || "0"),
    sha256: response.headers.get("x-amz-meta-sha256") || ""
  };
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
  if (!response.ok && response.status !== 404) throw new Error("Unable to remove an incomplete upload object.");
}

async function signedRequest(config: R2MvpConfig, method: string, key: string, query: Record<string, string>) {
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const payloadHash = sha256("");
  const headers = normalizeHeaders({ host, "x-amz-content-sha256": payloadHash, "x-amz-date": amzDate });
  const signedHeaders = Object.keys(headers).sort().join(";");
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const request = [method, canonicalUri(config.bucket, key), canonicalQuery(query), canonicalHeaders(headers), signedHeaders, payloadHash].join("\n");
  const signature = hmacHex(signingKey(config.secretAccessKey, dateStamp), ["AWS4-HMAC-SHA256", amzDate, scope, sha256(request)].join("\n"));
  return fetch(`https://${host}${canonicalUri(config.bucket, key)}?${canonicalQuery(query)}`, {
    method,
    headers: {
      "X-Amz-Content-Sha256": payloadHash,
      "X-Amz-Date": amzDate,
      Authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
    },
    cache: "no-store"
  });
}

function readEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
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
