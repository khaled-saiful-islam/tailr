import { Check, Send } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { useTrack, useUpdateApplication } from "@/features/tracker/api";
import { APPLIED_MESSAGE } from "@/features/tracker/messages";
import { STAGE_LABEL } from "@/features/tracker/stages";
import type { Kit } from "../api";

function shortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

/** After sending the application on the job site: one tap to record it. */
export function AppliedAction({ kit }: { kit: Kit }) {
  const track = useTrack();
  const update = useUpdateApplication();
  const application = kit.application;
  const early =
    !application ||
    application.stage === "saved" ||
    application.stage === "preparing";

  if (application && !early) {
    const label =
      application.stage === "applied" && application.applied_at
        ? `Applied ${shortDate(application.applied_at)}`
        : STAGE_LABEL[application.stage];
    return (
      <Link
        to={`/applications?open=${application.id}`}
        className="inline-flex h-10 items-center gap-2 rounded-full bg-surface-2 px-4 text-[0.9375rem] font-medium text-ink hover:bg-surface-3"
      >
        <Check className="size-4 text-fit-strong" aria-hidden />
        {label}
        <span className="sr-only">, open in your tracker</span>
      </Link>
    );
  }

  const options = {
    onSuccess: () => toast.success(APPLIED_MESSAGE),
    onError: (error: Error) => toast.error(error.message),
  };
  const apply = () => {
    if (application)
      update.mutate({ id: application.id, stage: "applied" }, options);
    else if (kit.match_id)
      track.mutate({ match_id: kit.match_id, stage: "applied" }, options);
  };
  if (!application && !kit.match_id) return null;
  return (
    <Button
      variant="secondary"
      icon={<Send className="size-4" />}
      loading={update.isPending || track.isPending}
      onClick={apply}
    >
      I've applied
    </Button>
  );
}
