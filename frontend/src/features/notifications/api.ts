import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, type Schemas } from "@/lib/api/client";
import { useLiveEvent } from "@/lib/events";

export type Notification = Schemas["NotificationOut"];
export type NotificationPage = Schemas["NotificationPage"];

export const notificationsKey = ["notifications"] as const;

/** Your latest notifications; refreshed whenever the server announces a new one. */
export function useNotifications() {
  const client = useQueryClient();
  useLiveEvent("notification", () => {
    void client.invalidateQueries({ queryKey: notificationsKey });
  });
  return useQuery({
    queryKey: notificationsKey,
    queryFn: () => unwrap(api.GET("/api/v1/notifications", {})),
  });
}

function markLocally(
  page: NotificationPage | undefined,
  isRead: (note: Notification) => boolean,
): NotificationPage | undefined {
  if (!page) return page;
  const items = page.items.map((note) =>
    isRead(note) ? { ...note, read: true } : note,
  );
  return { items, unread: items.filter((note) => !note.read).length };
}

export function useMarkRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(
        api.POST("/api/v1/notifications/{notification_id}/read", {
          params: { path: { notification_id: id } },
        }),
      ),
    onMutate: (id) =>
      client.setQueryData<NotificationPage>(notificationsKey, (page) =>
        markLocally(page, (note) => note.id === id),
      ),
    onSettled: () => client.invalidateQueries({ queryKey: notificationsKey }),
  });
}

export function useMarkAllRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(api.POST("/api/v1/notifications/read-all", {})),
    onMutate: () =>
      client.setQueryData<NotificationPage>(notificationsKey, (page) =>
        markLocally(page, () => true),
      ),
    onSettled: () => client.invalidateQueries({ queryKey: notificationsKey }),
  });
}
