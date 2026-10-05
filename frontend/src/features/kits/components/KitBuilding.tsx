import { Check } from "lucide-react";
import { motion } from "motion/react";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import { STAGES, stageIndex } from "../options";

/** The application being prepared: a running stitch and its three stages. */
export function KitBuilding({ stage }: { stage: string }) {
  const current = stageIndex(stage);
  return (
    <section
      aria-labelledby="building-heading"
      aria-live="polite"
      className="relative overflow-hidden rounded-sheet border border-line bg-surface p-6 shadow-sheet sm:p-8"
    >
      <svg
        aria-hidden
        className="absolute inset-x-0 top-0 h-2 w-full"
        preserveAspectRatio="none"
        viewBox="0 0 100 2"
      >
        <line
          x1="0"
          y1="1"
          x2="100"
          y2="1"
          stroke="var(--tape)"
          strokeWidth="2"
          strokeDasharray="6 6"
          vectorEffect="non-scaling-stroke"
          className="animate-[tailr-stitch_900ms_linear_infinite]"
        />
      </svg>
      <h2 id="building-heading" className="type-heading">
        Preparing your application…
      </h2>
      <p className="mt-1.5 max-w-[36rem] text-ink-2">
        This takes a minute or two. You can leave this page; Tailr keeps going
        and lets you know when your application is ready.
      </p>

      <div className="mt-7 grid items-start gap-8 md:grid-cols-[minmax(0,1fr)_14rem]">
        <ol className="flex flex-col gap-5">
          {STAGES.map((item, index) => {
            const done = index < current;
            const active = index === current;
            return (
              <motion.li
                key={item.key}
                initial={false}
                animate={{ opacity: done || active ? 1 : 0.5 }}
                className="flex gap-3.5"
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full border-2",
                    done && "border-fit-strong bg-fit-strong text-white",
                    active && "border-tape text-ink",
                    !done && !active && "border-line-strong text-ink-3",
                  )}
                >
                  {done ? (
                    <Check className="size-4" aria-hidden />
                  ) : active ? (
                    <Spinner className="size-4" label={item.label} />
                  ) : (
                    <span className="text-[0.8125rem] font-semibold">
                      {index + 1}
                    </span>
                  )}
                </span>
                <span className="pt-1">
                  <span className="block font-semibold">{item.label}</span>
                  <span className="block text-[0.9375rem] text-ink-2">
                    {item.detail}
                  </span>
                </span>
              </motion.li>
            );
          })}
        </ol>
        <DocumentSketch />
      </div>
    </section>
  );
}

/** Width of each sketched line on the page, as a share of the line. */
const LINES = [0.55, 0.9, 0.82, 0.95, 0.4, 0.88, 0.76, 0.92, 0.6];

/** A page filling with lines, over and over, while Tailr writes. */
function DocumentSketch() {
  return (
    <div
      aria-hidden
      className="hidden rounded-doc border border-line bg-canvas p-5 shadow-sheet md:block"
    >
      <div className="h-3 w-2/3 rounded-full bg-ink/80" />
      <div className="mt-2 h-2 w-1/2 rounded-full bg-ink-3/50" />
      <div className="mt-5 flex flex-col gap-2.5">
        {LINES.map((width, index) => (
          <motion.div
            key={index}
            className="h-2 origin-left rounded-full bg-[color-mix(in_oklab,var(--tape)_55%,var(--surface-3))]"
            style={{ width: `${width * 100}%` }}
            initial={{ scaleX: 0, opacity: 0.4 }}
            animate={{ scaleX: [0, 1, 1, 0], opacity: [0.4, 1, 1, 0.4] }}
            transition={{
              duration: 4.5,
              times: [0, 0.18, 0.85, 1],
              delay: index * 0.22,
              repeat: Infinity,
              repeatDelay: 0.6,
              ease: "easeOut",
            }}
          />
        ))}
      </div>
    </div>
  );
}
