import { useCallback } from "react";
import {
  useVersionedAutosave,
  type SaveStatus,
} from "@/lib/useVersionedAutosave";
import { useProfile, useSaveProfile } from "../api";
import { normalize, toApi, type ProfileDoc, type ProfileOut } from "../types";

export type { SaveStatus };

/** The profile builder's state: local document, autosave, strength from the server. */
export function useProfileEditor() {
  const query = useProfile();
  const { mutate } = useSaveProfile();
  const { refetch } = query;

  const editor = useVersionedAutosave<ProfileOut, ProfileDoc>({
    data: query.data,
    read: (profile) => ({
      value: normalize(profile.document),
      version: profile.version,
    }),
    save: ({ value, version }, { onSuccess, onError }) =>
      mutate(
        { document: toApi(value), version },
        { onSuccess: (profile) => onSuccess(profile.version), onError },
      ),
    refetch: useCallback(async () => (await refetch()).data, [refetch]),
  });

  return {
    doc: editor.value,
    update: editor.update,
    status: editor.status,
    retry: editor.retry,
    reload: editor.reload,
    strength: query.data?.strength,
    exists: query.data?.exists ?? false,
    isLoading: query.isPending,
    error: query.error,
  };
}
