import { useNavigate } from "react-router";
import { toast } from "sonner";
import { notifySystem } from "@/lib/browserNotifications";
import { useLiveEvent } from "@/lib/events";
import { useMarkRead, type Notification } from "./api";

/**
 * Tell the person when background work finishes: a system notification if
 * Tailr's tab is hidden, otherwise a toast with a way to open the result.
 * Mounted once, in the app shell.
 */
export function useNotificationAlerts(): void {
  const navigate = useNavigate();
  const markRead = useMarkRead();

  useLiveEvent<Notification>("notification", (event) => {
    const note = event.data;
    const open = () => {
      markRead.mutate(note.id);
      if (note.link) navigate(note.link);
    };
    if (
      document.hidden &&
      notifySystem(note.title, { body: note.body, tag: note.id, onClick: open })
    ) {
      return;
    }
    // Already looking at it: the page updates itself, so just mark it read.
    if (note.link && note.link === window.location.pathname) {
      markRead.mutate(note.id);
      return;
    }
    const show = note.kind.endsWith(".failed") ? toast.error : toast.success;
    show(note.title, {
      description: note.body ?? undefined,
      duration: 10_000,
      action: note.link ? { label: "Open", onClick: open } : undefined,
    });
  });
}
