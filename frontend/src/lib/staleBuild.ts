/**
 * After Tailr is updated, a tab that was already open still asks for the previous build's
 * files, which no longer exist ("Failed to fetch dynamically imported module"). Reloading
 * picks up the new build. A short guard stops a reload loop if the files are truly missing.
 */
const KEY = "tailr.reloaded-for-update";
const GUARD_MS = 30_000;

const STALE =
  /dynamically imported module|Importing a module script failed|Unable to preload CSS/i;

export function isStaleBuildError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  return STALE.test(message);
}

/** Reload once to get the new build. False when it already tried just now (or can't tell). */
export function reloadForUpdate(now = Date.now()): boolean {
  try {
    const last = Number(window.sessionStorage.getItem(KEY) ?? 0);
    if (now - last < GUARD_MS) return false;
    window.sessionStorage.setItem(KEY, String(now));
  } catch {
    return false; // storage blocked: without the guard, don't risk a loop
  }
  window.location.reload();
  return true;
}

/** Vite announces a failed chunk load before the page sees it; reload right away. */
export function watchForUpdates(): void {
  window.addEventListener("vite:preloadError", () => {
    reloadForUpdate();
  });
}
