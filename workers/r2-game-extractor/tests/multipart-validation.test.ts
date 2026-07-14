import { describe, expect, it } from "vitest";
import {
  assertCompletedObjectSize,
  createStoredMultipartIdentity,
  isMultipartUploadActive,
  normalizeCompletedParts,
  readStoredMultipartIdentity,
  reconcileMultipartRequest,
  R2_MULTIPART_PART_SIZE,
  validateMultipartInitiation,
  withMultipartUploadState
} from "../../../src/lib/r2UploadValidation";

const ids = {
  buildId: "11111111-1111-4111-8111-111111111111",
  gameId: "22222222-2222-4222-8222-222222222222",
  ownerId: "33333333-3333-4333-8333-333333333333",
  uploadId: "r2-upload-id",
  objectKey: "_incoming/test/upload.zip",
  expectedSize: R2_MULTIPART_PART_SIZE + 1,
  expectedPartCount: 2
};

describe("multipart identity and state validation", () => {
  it("requires part count to exactly match file size", () => {
    expect(validateMultipartInitiation(ids.expectedSize, 2).expectedPartCount).toBe(2);
    expect(() => validateMultipartInitiation(ids.expectedSize, 1)).toThrow(/does not match/i);
    expect(() => validateMultipartInitiation(Number.MAX_SAFE_INTEGER, 1)).toThrow(/64 MiB/i);
  });

  it("round-trips a stored identity and rejects tampering", () => {
    const identity = createStoredMultipartIdentity(ids);
    const build = storedBuild(identity);
    expect(readStoredMultipartIdentity(build)).toEqual(identity);
    expect(() => readStoredMultipartIdentity({ ...build, r2_zip_key: "other.zip" })).toThrow(/stored multipart upload identity/i);
  });

  it("rejects a wrong upload id, build owner, object key, or game id", () => {
    const identity = createStoredMultipartIdentity(ids);
    const request = { buildId: ids.buildId, gameId: ids.gameId, zipKey: ids.objectKey, uploadId: ids.uploadId };
    expect(() => reconcileMultipartRequest(identity, request, ids.ownerId)).not.toThrow();
    expect(() => reconcileMultipartRequest(identity, { ...request, uploadId: "wrong" }, ids.ownerId)).toThrow(/does not match/i);
    expect(() => reconcileMultipartRequest(identity, { ...request, zipKey: "wrong" }, ids.ownerId)).toThrow(/does not match/i);
    expect(() => reconcileMultipartRequest(identity, { ...request, gameId: "wrong" }, ids.ownerId)).toThrow(/does not match/i);
    expect(() => reconcileMultipartRequest(identity, request, "wrong-owner")).toThrow(/does not match/i);
  });

  it("accepts only one exact, ordered set of valid R2 ETags", () => {
    const parts = normalizeCompletedParts([
      { partNumber: 2, etag: "\"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\"" },
      { partNumber: 1, etag: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" }
    ], 2);
    expect(parts.map((part) => part.partNumber)).toEqual([1, 2]);
    expect(() => normalizeCompletedParts([{ partNumber: 1, etag: "bad" }], 2)).toThrow(/do not match/i);
    expect(() => normalizeCompletedParts([
      { partNumber: 1, etag: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
      { partNumber: 1, etag: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" }
    ], 2)).toThrow(/invalid/i);
  });

  it("rejects a completed object whose actual size differs from the stored size", () => {
    expect(() => assertCompletedObjectSize(ids.expectedSize, ids.expectedSize)).not.toThrow();
    expect(() => assertCompletedObjectSize(ids.expectedSize + 1, ids.expectedSize)).toThrow(/does not match/i);
  });

  it("records terminal upload state so replay can be rejected", () => {
    const identity = createStoredMultipartIdentity(ids);
    const build = storedBuild(identity);
    const completed = withMultipartUploadState(build.manifest, "completed");
    const completedIdentity = readStoredMultipartIdentity({ ...build, manifest: completed });
    expect(completedIdentity.uploadState).toBe("completed");
    expect(isMultipartUploadActive("uploaded", completedIdentity)).toBe(false);
    expect(isMultipartUploadActive("uploading", identity)).toBe(true);
  });
});

function storedBuild(identity: ReturnType<typeof createStoredMultipartIdentity>) {
  return {
    id: ids.buildId,
    game_id: ids.gameId,
    created_by: ids.ownerId,
    r2_zip_key: ids.objectKey,
    size_bytes: ids.expectedSize,
    manifest: { multipartUpload: identity }
  };
}
