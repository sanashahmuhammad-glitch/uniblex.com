import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { extractValidatedZip, validateZipArchive } from "../zip-security";

describe("ZIP security validation", () => {
  it("accepts a small valid archive", () => {
    const zip = archive({ "index.html": "<html></html>", "Build/game.wasm": "wasm" });
    const result = extractValidatedZip(zip);
    expect(result.fileCount).toBe(2);
    expect(result.files.map((entry) => entry.path)).toContain("index.html");
  });

  it("rejects path traversal and absolute paths", () => {
    expect(() => validateZipArchive(archive({ "../index.html": "bad" }))).toThrow(/traversal/i);
    expect(() => validateZipArchive(archive({ "/index.html": "bad" }))).toThrow(/absolute/i);
    expect(() => validateZipArchive(archive({ "C:\\index.html": "bad" }))).toThrow(/absolute/i);
  });

  it("rejects duplicate normalized paths", () => {
    expect(() => validateZipArchive(archive({ "index.html": "one", "INDEX.html": "two" }))).toThrow(/duplicate/i);
  });

  it("rejects excessive file count and extracted size", () => {
    const zip = archive({ "index.html": "12345", "asset.js": "12345" }, { level: 0 });
    expect(() => validateZipArchive(zip, { maxFileCount: 1 })).toThrow(/too many files/i);
    expect(() => validateZipArchive(zip, { maxExtractedBytes: 9 })).toThrow(/extracted size/i);
  });

  it("rejects excessive compression ratios", () => {
    const zip = archive({ "index.html": "A".repeat(10_000) });
    expect(() => validateZipArchive(zip, { maxCompressionRatio: 2 })).toThrow(/compression ratio/i);
  });

  it("rejects malformed, encrypted, and unsupported archives", () => {
    expect(() => validateZipArchive(new Uint8Array([1, 2, 3, 4]))).toThrow(/end-of-central-directory/i);

    const encrypted = archive({ "index.html": "test" });
    patchHeaders(encrypted, 6, 8, (value) => value | 1);
    expect(() => validateZipArchive(encrypted)).toThrow(/encrypted/i);

    const unsupported = archive({ "index.html": "test" });
    patchHeaders(unsupported, 8, 10, () => 99);
    expect(() => validateZipArchive(unsupported)).toThrow(/unsupported compression/i);
  });

  it("rejects suspicious nested archives", () => {
    expect(() => validateZipArchive(archive({ "index.html": "ok", "payload.zip": "bad" }))).toThrow(/nested archives/i);
  });
});

function archive(files: Record<string, string>, options: { level?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 } = {}) {
  return zipSync(Object.fromEntries(Object.entries(files).map(([path, contents]) => [path, strToU8(contents)])), options);
}

function patchHeaders(bytes: Uint8Array, localFieldOffset: number, centralFieldOffset: number, update: (value: number) => number) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = 0; offset <= bytes.byteLength - 4; offset += 1) {
    const signature = view.getUint32(offset, true);
    if (signature === 0x04034b50) view.setUint16(offset + localFieldOffset, update(view.getUint16(offset + localFieldOffset, true)), true);
    if (signature === 0x02014b50) view.setUint16(offset + centralFieldOffset, update(view.getUint16(offset + centralFieldOffset, true)), true);
  }
}
