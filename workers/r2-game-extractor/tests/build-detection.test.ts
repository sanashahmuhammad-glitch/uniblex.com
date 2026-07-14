import { describe, expect, it } from "vitest";
import { createBuildPlan, validateBuildReferences } from "../build-detection";
import type { ValidatedZipEntry } from "../zip-security";

describe("WebGL build detection", () => {
  it.each([
    ["uncompressed", ""],
    ["brotli", ".br"],
    ["gzip", ".gz"],
    ["unityweb", ".unityweb"]
  ])("detects valid Unity %s builds", (mode, suffix) => {
    const paths = ["index.html", "Build/game.loader.js", `Build/game.framework.js${suffix}`, `Build/game.wasm${suffix}`, `Build/game.data${suffix}`];
    const plan = createBuildPlan(entries(paths));
    expect(plan.kind).toBe("unity");
    expect(plan.compression).toBe(mode);
    expect(() => validateBuildReferences(plan, {
      "index.html": '<script src="Build/game.loader.js"></script>',
      "Build/game.loader.js": `"Build/game.framework.js${suffix}";"Build/game.wasm${suffix}";"Build/game.data${suffix}"`
    })).not.toThrow();
  });

  it("accepts a generic HTML5 build and validates local assets", () => {
    const plan = createBuildPlan(entries(["game/index.html", "game/app.js", "game/style.css"]));
    expect(plan.kind).toBe("html5");
    expect(() => validateBuildReferences(plan, { "index.html": '<script src="app.js"></script><link href="style.css">' })).not.toThrow();
  });

  it("rejects malformed, missing, ambiguous, and unsafe entry points", () => {
    expect(() => createBuildPlan(entries(["Build/game.loader.js"]))).toThrow(/missing/i);
    expect(() => createBuildPlan(entries(["index.html", "other/index.html"]))).toThrow(/ambiguous/i);
    expect(() => createBuildPlan(entries(["index.html", "Build/game.loader.js", "Build/game.wasm"]))).toThrow(/incomplete/i);
    const generic = createBuildPlan(entries(["index.html", "app.js"]));
    expect(() => validateBuildReferences(generic, { "index.html": '<script src="../app.js"></script>' })).toThrow(/traversal/i);
    expect(() => validateBuildReferences(generic, { "index.html": '<script src="javascript:alert(1)"></script>' })).toThrow(/unsafe/i);
    expect(() => validateBuildReferences(generic, { "index.html": '<script src="missing.js"></script>' })).toThrow(/missing/i);
  });
});

function entries(paths: string[]): ValidatedZipEntry[] {
  return paths.map((archivePath) => ({ archivePath, compressedSize: 10, uncompressedSize: 10, directory: false }));
}
