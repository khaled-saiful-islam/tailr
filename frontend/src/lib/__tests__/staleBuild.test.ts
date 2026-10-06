import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isStaleBuildError, reloadForUpdate } from "../staleBuild";

describe("a tab left open across an update", () => {
  const reload = vi.fn();

  beforeEach(() => {
    window.sessionStorage.clear();
    vi.stubGlobal("location", { ...window.location, reload });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    reload.mockReset();
  });

  it("recognises the browser's messages for missing build files", () => {
    for (const message of [
      "Failed to fetch dynamically imported module: http://x/assets/JobDetailPage-D-4BsMde.js",
      "Importing a module script failed.",
      "error loading dynamically imported module",
      "Unable to preload CSS for /assets/a.css",
    ]) {
      expect(isStaleBuildError(new TypeError(message))).toBe(true);
    }
    expect(isStaleBuildError(new Error("Network request failed"))).toBe(false);
    expect(isStaleBuildError(null)).toBe(false);
  });

  it("reloads once, then not again straight away", () => {
    expect(reloadForUpdate(1_000_000)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(reloadForUpdate(1_010_000)).toBe(false); // 10 s later: the files really are missing
    expect(reload).toHaveBeenCalledTimes(1);
    expect(reloadForUpdate(1_040_000)).toBe(true); // a later update can reload again
  });
});
