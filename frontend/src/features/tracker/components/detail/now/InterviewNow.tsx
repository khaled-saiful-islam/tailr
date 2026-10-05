import { ArrowRight, Award, MessagesSquare, X } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { useCreateKit } from "@/features/kits/api";
import type { ApplicationDetail, ApplicationUpdate } from "../../../api";
import { shortWhen } from "../../../next";
import { NextStepFields } from "../NextStepFields";
import { AsideRow, NowShell, type NowProps } from "./NowShell";

/** No application written yet: write one, which brings interview prep with it. */
function StartPrep({ matchId }: { matchId: string }) {
  const create = useCreateKit();
  const navigate = useNavigate();
  return (
    <Button
      variant="tape"
      loading={create.isPending}
      onClick={() =>
        create.mutate(
          { match_id: matchId, language: "en", tone: "confident" },
          {
            onSuccess: (kit) => navigate(`/apply/${kit.id}?tab=interview`),
            onError: (error) => toast.error(error.message),
          },
        )
      }
    >
      Prepare interview answers
    </Button>
  );
}

function GetReady({ app }: { app: ApplicationDetail }) {
  if (!app.kit_id && !app.match_id) return null;
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-panel bg-chalk-soft px-4 py-4 sm:px-5">
      <div className="flex min-w-[min(100%,16rem)] flex-1 items-start gap-3">
        <MessagesSquare
          className="mt-0.5 size-5 shrink-0 text-chalk"
          aria-hidden
        />
        <div>
          <p className="font-semibold">Get ready for it</p>
          <p className="mt-0.5 text-[0.9375rem] text-ink-2">
            The questions they'll probably ask, and the stories from your own
            experience that answer them best.
          </p>
        </div>
      </div>
      {app.kit_id ? (
        <Button asChild variant="tape">
          <Link to={`/apply/${app.kit_id}?tab=interview`}>
            Practise for the interview{" "}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Button>
      ) : (
        <StartPrep matchId={app.match_id!} />
      )}
    </div>
  );
}

/** Talking to them: when it is, getting ready, and what happened. */
export function InterviewNow({
  app,
  onMove,
  save,
}: NowProps & {
  save: (patch: ApplicationUpdate, delay?: number) => void;
}) {
  const at = app.next_step_at ? shortWhen(app.next_step_at) : null;
  const past = Boolean(
    app.next_step_at && new Date(app.next_step_at) <= new Date(),
  );
  return (
    <NowShell
      title={
        past
          ? "How did it go?"
          : at
            ? `${app.next_step ?? "Your interview"}, ${at}`
            : "Next: add the interview date"
      }
      lead={
        past
          ? `${app.next_step ?? "Your interview"} was on ${at}. Tell Tailr what happened below, or add the next round here.`
          : at
            ? "Tailr reminds you the day before. Change the details here if they move it."
            : "Add what it is and when, and Tailr reminds you the day before."
      }
    >
      <NextStepFields app={app} save={save} label="What is it?" />
      <GetReady app={app} />
      <AsideRow>
        <span className="text-ink-2">How did it go?</span>
        <Button
          size="sm"
          variant="secondary"
          icon={<Award className="size-3.5" />}
          onClick={() => onMove("offer")}
        >
          I got an offer
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
