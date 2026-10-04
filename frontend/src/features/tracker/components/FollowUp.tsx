import { Copy, Mail, MailCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { copyText } from "@/lib/clipboard";
import {
  followUpDue,
  useDraftFollowUp,
  useFollowedUp,
  type ApplicationDetail,
} from "../api";
import { dayLabel } from "../dates";

function mailto(app: ApplicationDetail): string {
  const draft = app.follow_up_draft!;
  const query = new URLSearchParams({
    subject: draft.subject,
    body: draft.body,
  })
    .toString()
    .replace(/\+/g, "%20");
  return `mailto:${app.contact_email ?? ""}?${query}`;
}

/** A week after applying: a short, truthful note, ready to copy or send. */
export function FollowUp({ app }: { app: ApplicationDetail }) {
  const draft = useDraftFollowUp();
  const done = useFollowedUp();
  const due = followUpDue(app);
  const text = app.follow_up_draft;

  if (app.followed_up_at) {
    return (
      <p className="flex items-start gap-2 rounded-control bg-surface-2 px-4 py-3 text-[0.9375rem]">
        <MailCheck
          className="mt-0.5 size-4 shrink-0 text-fit-strong"
          aria-hidden
        />
        You followed up on {dayLabel(app.followed_up_at)}. If nothing comes back
        in a week or two, it's fine to put your energy elsewhere.
      </p>
    );
  }

  const write = () =>
    draft.mutate(app.id, { onError: (error) => toast.error(error.message) });

  return (
    <div
      className={
        due
          ? "rounded-panel border border-tape-deep/40 bg-tape/15 p-4"
          : "rounded-panel border border-line p-4"
      }
    >
      <p className="font-semibold">
        {due ? "Time to follow up" : "Following up"}
      </p>
      <p className="mt-1 text-[0.9375rem] text-ink-2">
        {due
          ? "It's been a week since you applied. A short, friendly note keeps you on their radar."
          : app.follow_up_due_at
            ? `Tailr will remind you on ${dayLabel(app.follow_up_due_at)}, a week after you applied.`
            : "Tailr reminds you a week after you apply."}
      </p>

      {text ? (
        <div className="mt-4">
          <div className="rounded-control border border-line bg-surface p-4 text-[0.9375rem]">
            <p className="font-semibold">{text.subject}</p>
            <p className="mt-2 whitespace-pre-line leading-relaxed">
              {text.body}
            </p>
          </div>
          <p className="mt-2 text-[0.8125rem] text-ink-3">
            Written only from your profile and your application. Read it before
            you send it.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              icon={<Copy className="size-3.5" />}
              onClick={() =>
                void copyText(`${text.subject}\n\n${text.body}`, "Follow-up")
              }
            >
              Copy
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={<Mail className="size-3.5" />}
              asChild
            >
              <a href={mailto(app)}>Open in email</a>
            </Button>
            <Button
              size="sm"
              loading={done.isPending}
              onClick={() =>
                done.mutate(app.id, {
                  onSuccess: () =>
                    toast.success("Nice. Noted that you followed up."),
                  onError: (error) => toast.error(error.message),
                })
              }
            >
              I've sent it
            </Button>
            <Button
              size="sm"
              variant="ghost"
              loading={draft.isPending}
              onClick={write}
            >
              Draft again
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={due ? "tape" : "secondary"}
            icon={<Sparkles className="size-3.5" />}
            loading={draft.isPending}
            onClick={write}
          >
            {due ? "Draft a follow-up" : "Draft one now"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            loading={done.isPending}
            onClick={() =>
              done.mutate(app.id, {
                onError: (error) => toast.error(error.message),
              })
            }
          >
            I already followed up
          </Button>
        </div>
      )}
    </div>
  );
}
