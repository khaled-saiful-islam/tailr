import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, type Schemas } from "@/lib/api/client";

export type User = Schemas["UserOut"];
export type SignInInput = Schemas["LoginRequest"];
export type SignUpInput = Schemas["RegisterRequest"];
export type UpdateMeInput = Schemas["UpdateMeRequest"];

export const meKey = ["me"] as const;

/** The signed-in user, or `null` when signed out. */
export function useMe() {
  return useQuery({
    queryKey: meKey,
    queryFn: async (): Promise<User | null> =>
      (await unwrap(api.GET("/api/v1/auth/session"))).user ?? null,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useSignIn() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: SignInInput) =>
      unwrap(api.POST("/api/v1/auth/login", { body })),
    onSuccess: (user) => client.setQueryData(meKey, user),
  });
}

export function useSignUp() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: SignUpInput) =>
      unwrap(api.POST("/api/v1/auth/register", { body })),
    onSuccess: (user) => client.setQueryData(meKey, user),
  });
}

export function useSignOut() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(api.POST("/api/v1/auth/logout")),
    onSettled: () => {
      client.clear();
      client.setQueryData(meKey, null);
    },
  });
}

export function useUpdateMe() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateMeInput) =>
      unwrap(api.PATCH("/api/v1/auth/me", { body })),
    onSuccess: (user) => client.setQueryData(meKey, user),
  });
}
