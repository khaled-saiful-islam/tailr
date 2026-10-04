import { Flag, Mail, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconButton, Panel } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import { relativeTime } from "@/lib/format";
import { useDeleteMessage, useInbox, useMarkMessageRead } from "../api";

const REASON = {
  job: "Job opportunity",
  freelance: "Freelance work",
  hello: "Saying hi",
} as const;

/** Messages sent through the website's contact form. */
export function InboxPanel() {
  const inbox = useInbox();
  const markRead = useMarkMessageRead();
  const remove = useDeleteMessage();

  return (
    <Panel
      title="Messages"
      description="Messages from your contact form. Each one was also emailed to you; reply from your email and your address is shared only then."
    >
      {inbox.isPending ? (
        <Spinner className="size-6 text-ink-3" />
      ) : inbox.isError ? (
        <p className="text-pin">{inbox.error.message}</p>
      ) : inbox.data.items.length === 0 ? (
        <p className="text-ink-2">
          No messages yet. Share your website to start the conversation.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {inbox.data.items.map((message) => (
            <li
              key={message.id}
              className={cn(
                "rounded-control border p-4",
                message.read
                  ? "border-line"
                  : "border-tape/70 bg-[color-mix(in_oklab,var(--tape)_6%,var(--surface))]",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {message.name}
                    {message.company && (
                      <span className="font-normal text-ink-2">
                        , {message.company}
                      </span>
                    )}
                  </p>
                  <p className="text-[0.8125rem] text-ink-3">
                    {REASON[message.reason]}, {relativeTime(message.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {message.flagged && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-pin-soft px-2 py-0.5 text-[0.75rem] font-semibold text-pin">
                      <Flag className="size-3" aria-hidden /> Looks like spam
                    </span>
                  )}
                  <IconButton
                    label={`Delete the message from ${message.name}`}
                    tone="danger"
                    onClick={() => remove.mutate(message.id)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </IconButton>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-line text-[0.9375rem] leading-relaxed">
                {message.message}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" asChild>
                  <a
                    href={`mailto:${message.email}?subject=${encodeURIComponent("Re: your message")}`}
                    onClick={() => !message.read && markRead.mutate(message.id)}
                  >
                    <Mail className="size-3.5" aria-hidden /> Reply
                  </a>
                </Button>
                {!message.read && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => markRead.mutate(message.id)}
                  >
                    Mark as read
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
