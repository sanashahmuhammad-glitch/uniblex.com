import { describe, expect, it } from "vitest";
import { canTransitionBuild, requireIdempotencyKey } from "../../../src/lib/gameBuildState";

describe("database build-state contract", () => {
  it("rejects duplicate completion and duplicate abort", () => {
    expect(canTransitionBuild("uploading", "uploaded")).toBe(true);
    expect(canTransitionBuild("uploaded", "uploaded")).toBe(false);
    expect(canTransitionBuild("uploading", "aborted")).toBe(true);
    expect(canTransitionBuild("aborted", "aborted")).toBe(false);
  });

  it("permits only one valid concurrent claim target from the observed state", () => {
    const observed = "uploading";
    expect(canTransitionBuild(observed, "uploaded")).toBe(true);
    expect(canTransitionBuild("uploaded", "aborted")).toBe(false);
  });

  it("rejects publish before extraction success", () => {
    expect(canTransitionBuild("uploaded", "publishing")).toBe(false);
    expect(canTransitionBuild("extracting", "publishing")).toBe(false);
    expect(canTransitionBuild("ready_for_preview", "publishing")).toBe(true);
  });

  it("makes rollback and delete terminal replays invalid", () => {
    expect(canTransitionBuild("published", "rolled_back")).toBe(true);
    expect(canTransitionBuild("rolled_back", "rolled_back")).toBe(false);
    expect(canTransitionBuild("deleting", "deleted")).toBe(true);
    expect(canTransitionBuild("deleted", "deleted")).toBe(false);
  });

  it("requires durable idempotency keys", () => {
    expect(requireIdempotencyKey("complete:11111111-1111")).toBe("complete:11111111-1111");
    expect(() => requireIdempotencyKey("short")).toThrow(/idempotency/i);
  });
});
