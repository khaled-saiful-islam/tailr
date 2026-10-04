import {
  Bell,
  BriefcaseBusiness,
  CalendarClock,
  CircleAlert,
  FileText,
  Mail,
} from "lucide-react";
import { Popover } from "radix-ui";
import { useState } from "react";
import { useNavigate } from "react-router";
import { cn } from "@/lib/cn";
import { relativeTime } from "@/lib/format";
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  type Notification,
} from "./api";
import { plainBody, plainLink, plainTitle } from "./plain";

function KindIcon({ kind }: { kind: string }) {
  const Icon = kind.endsWith(".failed")
    ? CircleAlert
    : kind.startsWith("tracker.")
      ? CalendarClock
      : kind.startsWith("message.")
        ? Mail
        : kind.startsWith("kit.") || kind.startsWith("cv.")
          ? FileText
          : BriefcaseBusiness;
  return (
    <Icon
      className={cn(
        "size-4",
        kind.endsWith(".failed") ? "text-pin" : "text-ink-2",
      )}
      aria-hidden
    />
  );
}

/** The bell: what finished while you were elsewhere. */
export function NotificationBell({
  side = "bottom",
  align = "start",
}: {
  side?: "bottom" | "right";
  align?: "start" | "end";
}) {
  const { data } = useNotifications();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const unread = data?.unread ?? 0;
  const items = data?.items ?? [];

  const openNote = (note: Notification) => {
    if (!note.read) markRead.mutate(note.id);
    setOpen(false);
    const link = plainLink(note.link);
    if (link) navigate(link);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={
          unread ? `Notifications, ${unread} unread` : "Notifications"
        }
        className="relative grid size-9 shrink-0 place-items-center rounded-[9px] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink data-[state=open]:bg-surface-2 data-[state=open]:text-ink"
      >
        <Bell className="size-[18px]" aria-hidden />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-pin px-1 text-[0.625rem] font-bold leading-none text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side={side}
          align={align}
          sideOffset={8}
          collisionPadding={16}
          className="z-50 w-[min(23rem,calc(100vw-2rem))] animate-pop rounded-panel border border-line bg-surface text-ink shadow-sheet"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 className="font-semibold">Notifications</h2>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                className="text-[0.875rem] font-semibold text-chalk hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-[0.9375rem] text-ink-2">
              Nothing yet. When Tailr finds new jobs or an application is ready,
              it shows up here.
            </p>
          ) : (
            <ul className="max-h-[min(28rem,60vh)] overflow-y-auto p-1.5">
              {items.map((note) => (
                <li key={note.id}>
                  <button
                    type="button"
                    onClick={() => openNote(note)}
                    className="flex w-full gap-3 rounded-control px-2.5 py-2.5 text-left transition-colors hover:bg-surface-2"
                  >
                    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-surface-2">
                      <KindIcon kind={note.kind} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block text-[0.9375rem] leading-snug",
                          note.read ? "text-ink-2" : "font-semibold",
                        )}
                      >
                        {plainTitle(note)}
                      </span>
                      {note.body && (
                        <span className="mt-0.5 block text-[0.875rem] text-ink-2">
                          {plainBody(note)}
                        </span>
                      )}
                      <span className="mt-1 block text-[0.8125rem] text-ink-3">
                        {relativeTime(note.created_at)}
                      </span>
                    </span>
                    {!note.read && (
                      <span className="mt-2 size-2 shrink-0 rounded-full bg-tape">
                        <span className="sr-only">Unread</span>
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
