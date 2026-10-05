import { useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { useKitForMatch } from "@/features/kits/api";
import { TailorAction } from "@/features/kits/components/TailorAction";
import { useRemoveApplication, type ApplicationDetail } from "../../../api";
import { AsideRow, NowShell, textButton, type NowProps } from "./NowShell";

/** Starting an application elsewhere on this page moves it to Preparing: show that. */
function KitWatcher({ app }: { app: ApplicationDetail }) {
  const kit = useKitForMatch(app.match_id!);
  const client = useQueryClient();
  const kitId = kit.data?.id;
  useEffect(() => {
    if (kitId && kitId !== app.kit_id)
      void client.invalidateQueries({ queryKey: ["applications"] });
  }, [kitId, app.kit_id, client]);
  return null;
}

/** For a job only saved: take it off the board. The job stays on the Jobs page. */
export function NotInterested({ app }: { app: ApplicationDetail }) {
  const [sure, setSure] = useState(false);
  const remove = useRemoveApplication();
  const navigate = useNavigate();
  if (!sure)
    return (
      <button
        type="button"
        className={`${textButton} text-ink-2`}
        onClick={() => setSure(true)}
      >
        Not interested any more
      </button>
    );
  return (
    <span className="flex flex-wrap items-center gap-2" role="alert">
      <span>Take it off My applications? It stays on your Jobs page.</span>
      <Button
        size="sm"
        variant="danger"
        loading={remove.isPending}
        onClick={() =>
          remove.mutate(app.id, {
            onSuccess: () => {
              toast("Taken off My applications.");
              navigate("/applications");
            },
            onError: (error) => toast.error(error.message),
          })
        }
      >
        Take it off
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setSure(false)}>
        Keep it
      </Button>
    </span>
  );
}

/** The first step for any job you're going for: an application written for it. */
export function PrepareFirst({ app }: { app: ApplicationDetail }) {
  if (app.match_id)
    return (
      <div className="max-w-[26rem]">
        <TailorAction matchId={app.match_id} />
        <KitWatcher app={app} />
      </div>
    );
  return (
    <Button asChild variant="tape">
      <a href={app.job.url} target="_blank" rel="noopener noreferrer">
        Open the job ad <ArrowUpRight className="size-4" aria-hidden />
      </a>
    </Button>
  );
}

export function SavedNow({ app, onMove }: NowProps) {
  return (
    <NowShell
      title="Next: prepare your application"
      lead="Tailr writes a CV and cover letter for this job using only your real experience. You check them, then send them yourself on the job site."
    >
      <PrepareFirst app={app} />
      <AsideRow>
        <span className="text-ink-2">Already sent it?</span>
        <button
          type="button"
          className={textButton}
          onClick={() => onMove("applied")}
        >
          Mark as applied
        </button>
        <span className="flex-1" aria-hidden />
        <NotInterested app={app} />
      </AsideRow>
    </NowShell>
  );
}
