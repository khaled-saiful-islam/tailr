import { useCallback } from "react";
import { useVersionedAutosave } from "@/lib/useVersionedAutosave";
import {
  completeSettings,
  useRadar,
  useSaveRadar,
  type CompleteSettings,
  type RadarOut,
} from "../api";
import { usePreview } from "./usePreview";

/**
 * Radar settings with autosave (once the radar exists) and a quick look at the job
 * sites that runs in the background a moment after anything that affects results changes.
 */
export function useRadarEditor() {
  const query = useRadar();
  const { mutate: saveRadar } = useSaveRadar();
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
  const look = usePreview(settings);

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
    ...look,
  };
}
