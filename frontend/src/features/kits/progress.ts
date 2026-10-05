import { useState } from "react";

/** The steps Tailr can see you do on this page: the CV, the letter, and the job ad. */
export type ProgressStep = "cv" | "letter" | "site";
export type Progress = Readonly<Record<ProgressStep, boolean>>;

const NOTHING_YET: Progress = { cv: false, letter: false, site: false };
const storageKey = (kitId: string) => `tailr.application-steps.${kitId}`;

/** What was done on this device. Blocked or odd storage just means nothing is ticked. */
export function readProgress(kitId: string): Progress {
  try {
    const raw = window.localStorage.getItem(storageKey(kitId));
    if (!raw) return NOTHING_YET;
    const saved = JSON.parse(raw) as Partial<Record<ProgressStep, unknown>>;
    return {
      cv: saved?.cv === true,
      letter: saved?.letter === true,
      site: saved?.site === true,
    };
  } catch {
    return NOTHING_YET;
  }
}

function writeProgress(kitId: string, progress: Progress): void {
  try {
    window.localStorage.setItem(storageKey(kitId), JSON.stringify(progress));
  } catch {
    // Private mode or full storage: the ticks last until the page closes.
  }
}

/**
 * Ticks for the steps to apply: downloading or copying the CV, the cover letter, and
 * opening the job ad from here. Marking the application as sent ticks everything.
 */
export function useKitProgress(kitId: string) {
  const [progress, setProgress] = useState(() => readProgress(kitId));
  const mark = (step: ProgressStep) => {
    if (progress[step]) return;
    const next = { ...progress, [step]: true };
    writeProgress(kitId, next);
    setProgress(next);
  };
  return { progress, mark };
}
