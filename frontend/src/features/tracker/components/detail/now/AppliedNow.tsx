import { CalendarCheck, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { followUpDue } from "../../../api";
import { followUpWhen } from "../../../next";
import { FollowUp } from "../../FollowUp";
import { AsideRow, NowShell, type NowProps } from "./NowShell";

/** Sent: wait, follow up after a week, and move it on when they answer. */
export function AppliedNow({ app, onMove }: NowProps) {
  const due = followUpDue(app);
  const followed = Boolean(app.followed_up_at);
  return (
    <NowShell
      tone={due ? "act" : "wait"}
      title={
        due
          ? "Next: follow up"
          : followed
            ? "Waiting to hear back"
            : "Sent. Now, wait to hear back"
      }
      lead={
        followed
          ? undefined
          : due
            ? followUpWhen(app, true)
            : `Replies usually take one to two weeks. ${followUpWhen(app, false)}`
      }
    >
      <FollowUp app={app} intro={false} />
      <AsideRow>
        <span className="text-ink-2">Heard back?</span>
        <Button
          size="sm"
          variant="secondary"
          icon={<CalendarCheck className="size-3.5" />}
          onClick={() => onMove("interview")}
        >
          I got an interview
        </Button>
        <Button
          size="sm"
          variant="ghost"
          icon={<X className="size-3.5" />}
          onClick={() => onMove("rejected")}
        >
          They said no
        </Button>
      </AsideRow>
    </NowShell>
  );
}
