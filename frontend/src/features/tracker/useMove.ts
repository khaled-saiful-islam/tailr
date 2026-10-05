import { toast } from "sonner";
import { useUpdateApplication, type Application } from "./api";
import type { Stage } from "./stages";

const CHEERS: Partial<Record<Stage, string>> = {
  applied: "Applied. Tailr will nudge you to follow up in a week.",
  interview: "An interview. Add the date so Tailr can remind you.",
  offer: "An offer. Well done.",
};

/** Move an application to a stage (and a place in its column), cheering the big steps. */
export function useMove() {
  const update = useUpdateApplication();
  return (
    app: Pick<Application, "id" | "stage">,
    stage: Stage,
    position?: number,
  ) =>
    update.mutate(
      { id: app.id, stage, ...(position === undefined ? {} : { position }) },
      {
        onSuccess: () => {
          const cheer = CHEERS[stage];
          if (cheer && app.stage !== stage) toast.success(cheer);
        },
        onError: (error) => toast.error(error.message),
      },
    );
}
