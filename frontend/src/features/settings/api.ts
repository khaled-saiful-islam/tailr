import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { meKey } from "@/features/auth/api";
import { api, unwrap, type Schemas } from "@/lib/api/client";

export type Device = Schemas["DeviceOut"];
export type Usage = Schemas["UsageOut"];

const devicesKey = ["devices"] as const;

/** Downloaded with the session cookie, as a JSON file. */
export const EXPORT_URL = "/api/v1/account/export";

export function useDevices() {
  return useQuery({
    queryKey: devicesKey,
    queryFn: () => unwrap(api.GET("/api/v1/auth/sessions")),
  });
}

export function useSignOutOthers() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(api.POST("/api/v1/auth/sessions/sign-out-others")),
    onSettled: () => void client.invalidateQueries({ queryKey: devicesKey }),
  });
}

export function useUsage() {
  return useQuery({
    queryKey: ["account", "usage"],
    queryFn: () => unwrap(api.GET("/api/v1/account/usage")),
  });
}

export function useChangePassword() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["ChangePasswordRequest"]) =>
      unwrap(api.POST("/api/v1/auth/password", { body })),
    // Changing the password signs every other device out.
    onSuccess: () => void client.invalidateQueries({ queryKey: devicesKey }),
  });
}

/** Deletes the account. The session goes with it, so everything cached goes too. */
export function useDeleteAccount() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (password: string) =>
      unwrap(api.DELETE("/api/v1/account", { body: { password } })),
    onSuccess: () => {
      client.clear();
      client.setQueryData(meKey, null);
    },
  });
}
