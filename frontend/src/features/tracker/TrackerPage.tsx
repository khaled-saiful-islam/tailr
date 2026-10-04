import { motion } from "motion/react";
import { Link, useSearchParams } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useMomentum } from "@/features/momentum/api";
import { AddJobDialog } from "@/features/kits/components/AddJobDialog";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { useBoard, useUpdateApplication, type Application } from "./api";
import { ApplicationSheet } from "./components/ApplicationSheet";
import { Board } from "./components/Board";
import { Funnel } from "./components/Funnel";
import { StageList } from "./components/StageList";
import type { Stage } from "./stages";

const CHEERS: Partial<Record<Stage, string>> = {
  applied: "Applied. Tailr will nudge you to follow up in a week.",
  interview: "An interview. Add the date so Tailr can remind you.",
  offer: "An offer. Well done.",
};

function Empty() {
  return (
    <section className="rounded-sheet border border-dashed border-line-strong px-6 py-12 text-center">
      <h2 className="type-heading">Nothing on your tracker yet</h2>
      <p className="mx-auto mt-2 max-w-[34rem] text-ink-2">
        Jobs arrive here when you save one from your brief or tailor an
        application. Move them along as things happen, and Tailr reminds you to
        follow up.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to="/">See today's jobs</Link>
        </Button>
        <AddJobDialog />
      </div>
    </section>
  );
}

/** Every job you're pursuing, from saved to signed. */
export function TrackerPage() {
  const board = useBoard();
  const momentum = useMomentum();
  const update = useUpdateApplication();
  const wide = useMediaQuery("(min-width: 768px)");
  const [params, setParams] = useSearchParams();
  const openId = params.get("open");

  const setOpen = (id: string | null) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (id) next.set("open", id);
        else next.delete("open");
        return next;
      },
      { replace: !id },
    );

  const move = (id: string, stage: Stage, position?: number) => {
    const before = board.data?.items.find(
      (item: Application) => item.id === id,
    );
    update.mutate(
      { id, stage, ...(position === undefined ? {} : { position }) },
      {
        onSuccess: () => {
          const cheer = CHEERS[stage];
          if (cheer && before?.stage !== stage) toast.success(cheer);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const goal = momentum.data?.goal;
  const items = board.data?.items ?? [];

  return (
    <div className="w-full px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="min-w-[min(100%,22rem)] flex-1"
        >
          <h1 className="type-title">Your applications</h1>
          <p className="mt-2 max-w-[40rem] text-ink-2">
            From saved to signed. Move a card when something changes; Tailr
            nudges you to follow up and reminds you before each next step.
          </p>
        </motion.div>
        <div className="flex flex-wrap items-center gap-3">
          {goal && (
            <Link
              to="/"
              className="rounded-full bg-surface-2 px-3.5 py-2 text-[0.875rem] hover:bg-surface-3"
            >
              <span className="type-figure">
                {goal.done} of {goal.target}
              </span>{" "}
              applications this week
            </Link>
          )}
          {items.length > 0 && <AddJobDialog />}
        </div>
      </header>

      {board.isPending ? (
        <div className="grid min-h-[40vh] place-items-center">
          <Spinner className="size-7 text-ink-3" />
        </div>
      ) : board.isError ? (
        <p role="alert" className="mt-10 text-ink-2">
          {board.error.message}
        </p>
      ) : items.length === 0 ? (
        <div className="mt-10">
          <Empty />
        </div>
      ) : (
        <>
          {momentum.data && (
            <div className="mt-8 rounded-panel border border-line bg-surface p-5">
              <Funnel funnel={momentum.data.funnel} />
            </div>
          )}
          <div className="mt-8">
            {wide ? (
              <Board items={items} onOpen={setOpen} onMove={move} />
            ) : (
              <StageList items={items} onOpen={setOpen} />
            )}
          </div>
        </>
      )}

      <ApplicationSheet
        id={openId}
        onClose={() => setOpen(null)}
        onMove={(id, stage) => move(id, stage)}
      />
    </div>
  );
}
