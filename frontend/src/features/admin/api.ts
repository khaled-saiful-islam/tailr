import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api, unwrap, type Schemas } from "@/lib/api/client";

export type Overview = Schemas["Overview"];
export type AdminUser = Schemas["AdminUserRow"];
export type AdminUserDetail = Schemas["AdminUserDetail"];
export type AdminUserUpdate = Schemas["AdminUserUpdate"];
export type UserStatus = "all" | "disabled" | "ai_off" | "admins";

export const PAGE_SIZE = 50;
const adminKey = ["admin"] as const;
const userKey = (id: string) => [...adminKey, "user", id] as const;

/** Asked for only once we know the viewer is an admin. */
export function useOverview(enabled: boolean) {
  return useQuery({
    queryKey: [...adminKey, "overview"],
    queryFn: () => unwrap(api.GET("/api/v1/admin/overview", {})),
    refetchInterval: 60_000,
    enabled,
  });
}

export function useUsers(query: string, status: UserStatus, page: number) {
  return useQuery({
    queryKey: [...adminKey, "users", query, status, page],
    queryFn: () =>
      unwrap(
        api.GET("/api/v1/admin/users", {
          params: {
            query: {
              q: query.trim() || undefined,
              status,
              limit: PAGE_SIZE,
              offset: page * PAGE_SIZE,
            },
          },
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useAdminUser(id: string | null) {
  return useQuery({
    queryKey: userKey(id ?? ""),
    queryFn: () =>
      unwrap(
        api.GET("/api/v1/admin/users/{user_id}", {
          params: { path: { user_id: id! } },
        }),
      ),
    enabled: Boolean(id),
  });
}

/** Change one switch on one account; the sheet shows the answer, the list refreshes. */
export function useUpdateUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: AdminUserUpdate & { id: string }) =>
      unwrap(
        api.PATCH("/api/v1/admin/users/{user_id}", {
          params: { path: { user_id: id } },
          body,
        }),
      ),
    onSuccess: (detail) => client.setQueryData(userKey(detail.id), detail),
    onSettled: () => {
      void client.invalidateQueries({ queryKey: [...adminKey, "users"] });
      void client.invalidateQueries({ queryKey: [...adminKey, "overview"] });
    },
  });
}
