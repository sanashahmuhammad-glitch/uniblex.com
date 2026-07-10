import { createHmac, createHash, randomUUID } from "crypto";

type R2Config = {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
};

type PresignOptions = {
  method: string;
  key: string;
  query?: Record<string, string>;
  expires?: number;
  headers?: Record<string, string>;
};

const service = "s3";
const region = "auto";
const unsignedPayload = "UNSIGNED-PAYLOAD";

export type CompletedPart = {
  partNumber: number;
  etag: string;
};

export function getR2Config(): R2Config {
  const accountId = getEnv("R2_ACCOUNT_ID", "CLOUDFLARE_R2_ACCOUNT_ID");
  const bucket = getEnv("R2_BUCKET", "CLOUDFLARE_R2_BUCKET");
  const accessKeyId = getEnv("R2_ACCESS_KEY_ID", "CLOUDFLARE_R2_ACCESS_KEY_ID");
  const secretAccessKey = getEnv("R2_SECRET_ACCESS_KEY", "CLOUDFLARE_R2_SECRET_ACCESS_KEY");
  const publicBaseUrl = getEnv("R2_PUBLIC_BASE_URL", "NEXT_PUBLIC_R2_PUBLIC_BASE_URL");

  if (!accountId || !bucket || !accessKeyId || !secretAccessKey || !publicBaseUrl) {
    throw new Error("Cloudflare R2 publishing environment variables are not configured.");
  }

  return { accountId, bucket, accessKeyId, secretAccessKey, publicBaseUrl: publicBaseUrl.replace(/\/+$/, "") };
}

export function createBuildKeys(slug: string, version: number) {
  const uploadId = randomUUID();
  const base = `games/${slug}/builds/v${version}`;

  return {
    uploadId,
    zipKey: `_incoming/${slug}/${uploadId}.zip`,
    extractPrefix: `${base}/`
  };
}

export function buildPublicIndexUrl(config: R2Config, extractPrefix: string) {
  return `${config.publicBaseUrl}/${extractPrefix}index.html`;
}

export function presignR2Url(config: R2Config, options: PresignOptions) {
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const headers = normalizeHeaders({ host, ...(options.headers ?? {}) });
  const signedHeaders = Object.keys(headers).sort().join(";");
  const query: Record<string, string> = {
    ...(options.query ?? {}),
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${config.accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(options.expires ?? 900),
    "X-Amz-SignedHeaders": signedHeaders
  };

  const canonicalRequest = [
    options.method.toUpperCase(),
    canonicalUri(config.bucket, options.key),
    canonicalQuery(query),
    canonicalHeaders(headers),
    signedHeaders,
    unsignedPayload
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256(canonicalRequest)
  ].join("\n");
  query["X-Amz-Signature"] = hmacHex(getSigningKey(config.secretAccessKey, dateStamp), stringToSign);

  return `https://${host}${canonicalUri(config.bucket, options.key)}?${canonicalQuery(query)}`;
}

export async function initiateMultipartUpload(config: R2Config, key: string) {
  const response = await signedR2Fetch(config, "POST", key, { uploads: "" });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || "Unable to initiate R2 multipart upload.");
  }

  const uploadId = text.match(/<UploadId>([^<]+)<\/UploadId>/)?.[1];
  if (!uploadId) throw new Error("R2 did not return an upload id.");
  return decodeXml(uploadId);
}

export async function completeMultipartUpload(config: R2Config, key: string, uploadId: string, parts: CompletedPart[]) {
  const body = `<CompleteMultipartUpload>${parts
    .sort((left, right) => left.partNumber - right.partNumber)
    .map((part) => `<Part><PartNumber>${part.partNumber}</PartNumber><ETag>${escapeXml(part.etag)}</ETag></Part>`)
    .join("")}</CompleteMultipartUpload>`;

  const response = await signedR2Fetch(config, "POST", key, { uploadId }, body);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || "Unable to complete R2 multipart upload.");
  }
}

export async function abortMultipartUpload(config: R2Config, key: string, uploadId: string) {
  const response = await signedR2Fetch(config, "DELETE", key, { uploadId });

  if (!response.ok && response.status !== 404) {
    throw new Error((await response.text()) || "Unable to abort R2 multipart upload.");
  }
}

async function signedR2Fetch(
  config: R2Config,
  method: string,
  key: string,
  query: Record<string, string>,
  body?: string
) {
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const payloadHash = sha256(body ?? "");
  const headers = normalizeHeaders({
    host,
    "content-type": "application/xml",
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate
  });
  const signedHeaders = Object.keys(headers).sort().join(";");
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalRequest = [
    method,
    canonicalUri(config.bucket, key),
    canonicalQuery(query),
    canonicalHeaders(headers),
    signedHeaders,
    payloadHash
  ].join("\n");
  const signature = hmacHex(
    getSigningKey(config.secretAccessKey, dateStamp),
    ["AWS4-HMAC-SHA256", amzDate, credentialScope, sha256(canonicalRequest)].join("\n")
  );

  return fetch(`https://${host}${canonicalUri(config.bucket, key)}?${canonicalQuery(query)}`, {
    method,
    headers: {
      "Content-Type": "application/xml",
      "X-Amz-Content-Sha256": payloadHash,
      "X-Amz-Date": amzDate,
      Authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
    },
    body
  });
}

function getEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }

  return "";
}

function normalizeHeaders(headers: Record<string, string>) {
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value.trim()]));
}

function canonicalHeaders(headers: Record<string, string>) {
  return Object.entries(headers)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${value}\n`)
    .join("");
}

function canonicalUri(bucket: string, key: string) {
  return `/${encodePath(bucket)}/${encodePath(key)}`;
}

function encodePath(value: string) {
  return value.split("/").map((part) => encodeURIComponent(part)).join("/");
}

function canonicalQuery(query: Record<string, string>) {
  return Object.entries(query)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

function toAmzDate(date: Date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value).digest();
}

function hmacHex(key: Buffer, value: string) {
  return createHmac("sha256", key).update(value).digest("hex");
}

function getSigningKey(secret: string, dateStamp: string) {
  const dateKey = hmac(`AWS4${secret}`, dateStamp);
  const dateRegionKey = hmac(dateKey, region);
  const dateRegionServiceKey = hmac(dateRegionKey, service);
  return hmac(dateRegionServiceKey, "aws4_request");
}

function decodeXml(value: string) {
  return value.replace(/&quot;/g, "\"").replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
