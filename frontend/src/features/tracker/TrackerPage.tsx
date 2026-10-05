import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useMomentum } from "@/features/momentum/api";
import { AddJobDialog } from "@/features/kits/components/AddJobDialog";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { useBoard } from "./api";
import { Board } from "./components/Board";
import { HowFar } from "./components/HowFar";
import { NeedsYou } from "./components/NeedsYou";
import { StageList } from "./components/StageList";
import { useMove } from "./useMove";

const EASE = [0.22, 1, 0.36, 1] as const;

function Empty() {
  return (
    <section className="rounded-sheet border border-dashed border-line-strong px-6 py-12 text-center">
      <h2 className="type-heading">No applications yet</h2>
      <p className="mx-auto mt-2 max-w-[34rem] text-ink-2">
        A job lands here when you save it or prepare an application for it. Each
        one then shows what to do next, from preparing it to following up.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to="/jobs">See your jobs</Link>
        </Button>
        <AddJobDialog />
      </div>
    </section>
  );
}

/**
 * Sections fade up in turn. The board only fades: a transformed ancestor would throw
 * off the dragged card, which is positioned against the window.
 */
function Rise({
  delay,
  lift = true,
  children,
}: {
  delay: number;
  lift?: boolean;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={lift ? { opacity: 0, y: 12 } : { opacity: 0 }}
      animate={lift ? { opacity: 1, y: 0 } : { opacity: 1 }}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Every job you're going for: what needs you now, then the whole board. */
export function TrackerPage() {
  const board = useBoard();
  const momentum = useMomentum();
  const move = useMove();
  const navigate = useNavigate();
  const wide = useMediaQuery("(min-width: 768px)");
  const [params] = useSearchParams();

  // Old links (notifications, reminders) opened a side sheet: open the page instead.
  const legacy = params.get("open");
  if (legacy) return <Navigate to={`/applications/${legacy}`} replace />;

  const goal = momentum.data?.goal;
  const items = board.data?.items ?? [];
  const open = (id: string) => navigate(`/applications/${id}`);

  return (
    <div className="w-full px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="min-w-[min(100%,22rem)] flex-1"
        >
          <h1 className="type-title">My applications</h1>
          <p className="mt-2 max-w-[40rem] text-ink-2">
            Every job you're going for, from saved to offer. Each card says what
            to do next; open one to do it.
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
          <div className="mt-8">
            <Rise delay={0.05}>
              <NeedsYou items={items} />
            </Rise>
          </div>
          <section aria-labelledby="board-heading" className="mt-10">
            <Rise delay={0.12} lift={false}>
              <div className="mb-4">
                <h2 id="board-heading" className="type-heading">
                  All your applications
                </h2>
                <p className="mt-1 text-[0.9375rem] text-ink-2">
                  {wide
                    ? "Drag a card to the next column when something changes, or open it to see what's next."
                    : "Pick a stage, then open a job to see what's next."}
                </p>
              </div>
              {wide ? (
                <Board
                  items={items}
                  onOpen={open}
                  onMove={(id, stage, position) => {
                    const app = items.find((item) => item.id === id);
                    if (app) move(app, stage, position);
                  }}
                />
              ) : (
                <StageList items={items} />
              )}
            </Rise>
          </section>
          {momentum.data && (
            <div className="mt-10">
              <HowFar funnel={momentum.data.funnel} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
