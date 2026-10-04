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
        This takes about a minute. You can leave this page; Tailr keeps going
        and lets you know when your application is ready.
      </p>

      <ol className="mt-7 flex flex-col gap-5">
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
    </section>
  );
}
