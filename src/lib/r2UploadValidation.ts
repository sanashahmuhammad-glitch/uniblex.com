

export const R2_MULTIPART_PART_SIZE = 8 * 1024 * 1024;
export const R2_MAX_ZIP_SIZE = 64 * 1024 * 1024;
export const R2_MAX_PART_COUNT = Math.ceil(R2_MAX_ZIP_SIZE / R2_MULTIPART_PART_SIZE);

export type StoredMultipartIdentity = {
  buildId: string;
  gameId: string;
  ownerId: string;
  uploadId: string;
  objectKey: string;
  expectedSize: number;
  expectedPartCount: number;
  partSize: number;
  uploadState: "uploading" | "aborting" | "aborted" | "completed";
};

type BuildRecord = {
  id: unknown;
  game_id: unknown;
  created_by: unknown;
  r2_zip_key: unknown;
  size_bytes: unknown;
  manifest: unknown;
};

export class MultipartValidationError extends Error {}

export function validateMultipartInitiation(fileSize: number, partCount: number) {
  if (!Number.isSafeInteger(fileSize) || fileSize <= 0 || fileSize > R2_MAX_ZIP_SIZE) {
    throw new MultipartValidationError("ZIP file size is invalid or exceeds the 64 MiB limit.");
  }

  const expectedPartCount = Math.ceil(fileSize / R2_MULTIPART_PART_SIZE);
  if (!Number.isSafeInteger(partCount) || partCount !== expectedPartCount || partCount > R2_MAX_PART_COUNT) {
    throw new MultipartValidationError("Multipart part count does not match the requested file size.");
  }

  return { expectedPartCount, partSize: R2_MULTIPART_PART_SIZE };
}

export function createStoredMultipartIdentity(input: Omit<StoredMultipartIdentity, "partSize" | "uploadState">): StoredMultipartIdentity {
  return { ...input, partSize: R2_MULTIPART_PART_SIZE, uploadState: "uploading" };
}

export function readStoredMultipartIdentity(build: BuildRecord): StoredMultipartIdentity {
  const manifest = asRecord(build.manifest);
  const identity = asRecord(manifest.multipartUpload);
  const stored: StoredMultipartIdentity = {
    buildId: stringValue(identity.buildId),
    gameId: stringValue(identity.gameId),
    ownerId: stringValue(identity.ownerId),
    uploadId: stringValue(identity.uploadId),
    objectKey: stringValue(identity.objectKey),
    expectedSize: numberValue(identity.expectedSize),
    expectedPartCount: numberValue(identity.expectedPartCount),
    partSize: numberValue(identity.partSize),
    uploadState: stringValue(identity.uploadState) as StoredMultipartIdentity["uploadState"]
  };

  if (
    stored.buildId !== stringValue(build.id) ||
    stored.gameId !== stringValue(build.game_id) ||
    stored.ownerId !== stringValue(build.created_by) ||
    stored.objectKey !== stringValue(build.r2_zip_key) ||
    stored.expectedSize !== numberValue(build.size_bytes) ||
    stored.partSize !== R2_MULTIPART_PART_SIZE ||
    !Number.isSafeInteger(stored.expectedPartCount) ||
    stored.expectedPartCount < 1 ||
    stored.expectedPartCount > R2_MAX_PART_COUNT ||
    !stored.uploadId ||
    !["uploading", "aborting", "aborted", "completed"].includes(stored.uploadState)
  ) {
    throw new MultipartValidationError("Stored multipart upload identity is invalid.");
  }

  return stored;
}

export function reconcileMultipartRequest(
  identity: StoredMultipartIdentity,
  input: { buildId: string; gameId: string; zipKey: string; uploadId: string },
  ownerId: string
) {
  if (
    input.buildId !== identity.buildId ||
    input.gameId !== identity.gameId ||
    input.zipKey !== identity.objectKey ||
    input.uploadId !== identity.uploadId ||
    ownerId !== identity.ownerId
  ) {
    throw new MultipartValidationError("Multipart upload identity does not match the stored build.");
  }
}

export function normalizeCompletedParts(value: unknown, expectedPartCount: number): Array<{ partNumber: number; etag: string }> {
  if (!Array.isArray(value) || value.length !== expectedPartCount) {
    throw new MultipartValidationError("Uploaded parts do not match the stored upload.");
  }

  const parts = value.map((part) => {
    const record = asRecord(part);
    return { partNumber: numberValue(record.partNumber), etag: stringValue(record.etag).trim() };
  });
  const seen = new Set<number>();

  for (const part of parts) {
    if (
      !Number.isSafeInteger(part.partNumber) ||
      part.partNumber < 1 ||
      part.partNumber > expectedPartCount ||
      seen.has(part.partNumber) ||
      !/^"?[a-fA-F0-9]{32}"?$/.test(part.etag)
    ) {
      throw new MultipartValidationError("Uploaded parts are invalid.");
    }
    seen.add(part.partNumber);
  }

  parts.sort((left, right) => left.partNumber - right.partNumber);
  if (parts.some((part, index) => part.partNumber !== index + 1)) {
    throw new MultipartValidationError("Uploaded parts must form one complete sequence.");
  }
  return parts;
}

export function assertCompletedObjectSize(actualSize: number, expectedSize: number) {
  if (!Number.isSafeInteger(actualSize) || actualSize !== expectedSize) {
    throw new MultipartValidationError("Completed object size does not match the stored upload.");
  }
}
export function isMultipartUploadActive(buildStatus: unknown, identity: StoredMultipartIdentity) {
  return buildStatus === "uploading" && identity.uploadState === "uploading";
}

export function withMultipartUploadState(manifest: unknown, state: StoredMultipartIdentity["uploadState"]) {
  const root = asRecord(manifest);
  return { ...root, multipartUpload: { ...asRecord(root.multipartUpload), uploadState: state } };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" ? value : Number(value);
}
