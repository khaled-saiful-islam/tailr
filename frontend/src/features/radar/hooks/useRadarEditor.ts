import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVersionedAutosave } from "@/lib/useVersionedAutosave";
import {
  completeSettings,
  usePreviewRadar,
  useRadar,
  useSaveRadar,
  type CompleteSettings,
  type PreviewOut,
  type RadarOut,
} from "../api";

const PREVIEW_DEBOUNCE_MS = 1200;

/** Settings that change what the radar finds (the brief time doesn't). */
function previewKey(s: CompleteSettings): string {
  return JSON.stringify([
    s.roles,
    s.anywhere,
    s.places,
    s.work_modes,
    s.employment_types,
    s.seniority,
    s.salary_min,
    s.include_no_salary,
    s.must_have,
    s.exclude_keywords,
    s.exclude_companies,
    s.freshness_days,
    s.sources,
  ]);
}

/**
 * Radar settings with autosave (once the radar exists) and a live preview that
 * re-scans a moment after anything that affects results changes.
 */
export function useRadarEditor() {
  const query = useRadar();
  const { mutate: saveRadar } = useSaveRadar();
  const { mutate: runPreview, isPending: scanning } = usePreviewRadar();
  const [preview, setPreview] = useState<PreviewOut | undefined>();
  const [previewError, setPreviewError] = useState<string | null>(null);
  const exists = query.data?.exists ?? false;
  const { refetch } = query;

  const editor = useVersionedAutosave<RadarOut, CompleteSettings>({
    data: query.data,
    read: (radar) => ({
      value: completeSettings(radar.settings),
      version: radar.version,
    }),
    save: ({ value, version }, { onSuccess, onError }) =>
      saveRadar(
        { settings: value, version },
        { onSuccess: (radar) => onSuccess(radar.version), onError },
      ),
    refetch: useCallback(async () => (await refetch()).data, [refetch]),
    autosave: exists,
  });

  const settings = editor.value;
  const key = useMemo(() => (settings ? previewKey(settings) : ""), [settings]);
  const lastKey = useRef("");

  const scan = useCallback(() => {
    if (!settings || settings.roles.length === 0) return;
    lastKey.current = previewKey(settings);
    runPreview(settings, {
      onSuccess: (result) => {
        setPreview(result);
        setPreviewError(null);
      },
      onError: (error) => setPreviewError(error.message),
    });
  }, [settings, runPreview]);

  useEffect(() => {
    if (
      !settings ||
      !key ||
      key === lastKey.current ||
      settings.roles.length === 0
    )
      return;
    const first = lastKey.current === "";
    const timer = window.setTimeout(scan, first ? 0 : PREVIEW_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [key, settings, scan]);

  return {
    settings,
    update: editor.update,
    status: editor.status,
    retry: editor.retry,
    reload: editor.reload,
    saveNow: editor.saveNow,
    exists,
    radar: query.data,
    error: query.error,
    preview,
    previewError,
    scanning,
    scan,
  };
}
