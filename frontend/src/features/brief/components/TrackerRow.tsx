import { ArrowRight, Plus, Send } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { useTrack, useUpdateApplication } from "@/features/tracker/api";
import { APPLIED_MESSAGE } from "@/features/tracker/messages";
import { STAGE_LABEL } from "@/features/tracker/stages";
import type { MatchDetail } from "../api";

/** Where this job stands in My applications, with the next sensible step. */
export function TrackerRow({ match }: { match: MatchDetail }) {
  const track = useTrack();
  const update = useUpdateApplication();
  const application = match.application;
  const fail = (error: Error) => toast.error(error.message);

  if (!application) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.9375rem] text-ink-2">
          Not in My applications yet.
        </p>
        <Button
          variant="secondary"
          size="sm"
          icon={<Plus className="size-3.5" />}
          loading={track.isPending}
          onClick={() =>
            track.mutate(
              { match_id: match.id },
              {
                onSuccess: () => toast.success("Added to My applications."),
                onError: fail,
              },
            )
          }
        >
          Add to My applications
        </Button>
      </div>
    );
  }

  const early =
    application.stage === "saved" || application.stage === "preparing";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-[0.9375rem]">
        <span className="text-ink-2">In My applications: </span>
        <span className="font-semibold">{STAGE_LABEL[application.stage]}</span>
        <Link
          to={`/applications/${application.id}`}
          className="ml-2 inline-flex items-center gap-1 font-semibold text-chalk hover:underline"
        >
          Open <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </p>
      {early && (
        <Button
          variant="secondary"
          size="sm"
          icon={<Send className="size-3.5" />}
          loading={update.isPending}
          onClick={() =>
            update.mutate(
              { id: application.id, stage: "applied" },
              {
                onSuccess: () => toast.success(APPLIED_MESSAGE),
                onError: fail,
              },
            )
          }
        >
          I've applied
        </Button>
      )}
    </div>
  );
}
