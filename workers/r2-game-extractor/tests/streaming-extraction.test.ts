import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { streamValidatedZip, validateZipArchive } from "../zip-security";
import { cleanupPrefix } from "../../r2-game-extractor";

describe("streamed extraction and cleanup", () => {
  it("streams validated files without materializing the archive result", async () => {
    const zip = zipSync({ "index.html": strToU8("ok"), "app.js": strToU8("app") });
    const validation = validateZipArchive(zip);
    const received = new Map<string, string>();
    await streamValidatedZip(new Blob([zip]).stream(), validation, async (entry, body) => {
      received.set(entry.archivePath, await new Response(body).text());
    });
    expect(received).toEqual(new Map([["index.html", "ok"], ["app.js", "app"]]));
  });

  it("surfaces extraction sink failures", async () => {
    const zip = zipSync({ "index.html": strToU8("ok") });
    await expect(streamValidatedZip(new Blob([zip]).stream(), validateZipArchive(zip), async () => {
      throw new Error("sink failed");
    })).rejects.toThrow(/sink failed/i);
  });

  it("makes cleanup retry-safe and idempotent", async () => {
    let fail = true;
    const objects = [{ key: "prefix/a" }, { key: "prefix/b" }];
    const bucket = {
      list: async () => ({ objects: [...objects], truncated: false }),
      delete: async (key: string) => {
        if (fail) { fail = false; throw new Error("temporary"); }
        const index = objects.findIndex((object) => object.key === key);
        if (index >= 0) objects.splice(index, 1);
      }
    };
    const first = await cleanupPrefix(bucket as never, "prefix/");
    expect(first.ok).toBe(false);
    const second = await cleanupPrefix(bucket as never, "prefix/");
    expect(second.ok).toBe(true);
    const third = await cleanupPrefix(bucket as never, "prefix/");
    expect(third).toEqual({ ok: true, deleted: 0 });
  });
});
