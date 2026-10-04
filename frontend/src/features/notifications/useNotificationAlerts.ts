import { useNavigate } from "react-router";
import { toast } from "sonner";
import { notifySystem } from "@/lib/browserNotifications";
import { useLiveEvent } from "@/lib/events";
import { useMarkRead, type Notification } from "./api";
import { plainBody, plainLink, plainTitle } from "./plain";

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
    const link = plainLink(note.link);
    const title = plainTitle(note);
    const body = plainBody(note);
    const open = () => {
      markRead.mutate(note.id);
      if (link) navigate(link);
    };
    if (
      document.hidden &&
      notifySystem(title, {
        body: body ?? undefined,
        tag: note.id,
        onClick: open,
      })
    ) {
      return;
    }
    // Already looking at it: the page updates itself, so just mark it read.
    if (link && link === window.location.pathname) {
      markRead.mutate(note.id);
      return;
    }
    const show = note.kind.endsWith(".failed") ? toast.error : toast.success;
    show(title, {
      description: body ?? undefined,
      duration: 10_000,
      action: link ? { label: "Open", onClick: open } : undefined,
    });
  });
}
