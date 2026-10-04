import { CircleAlert } from "lucide-react";
import { motion } from "motion/react";
import { Panel } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import { useUsage } from "../api";
import { share, tokens } from "../zones";

/** Today's AI use, measured out on a strip of tape against your allowance. */
export function UsagePanel() {
  const usage = useUsage();
  const data = usage.data;

  return (
    <Panel
      id="ai"
      title="AI use"
      description="Preparing applications, drafting and job match reviews all use AI. Each account has a daily allowance."
    >
      {!data ? (
        usage.isError ? (
          <p className="text-ink-2">{usage.error.message}</p>
        ) : (
          <Spinner className="size-5 text-ink-3" />
        )
      ) : (
        <>
          {!data.ai_enabled && (
            <p
              role="status"
              className="mb-5 flex items-start gap-2.5 rounded-control border border-pin/30 bg-pin-soft px-4 py-3 text-[0.9375rem]"
            >
              <CircleAlert
                className="mt-0.5 size-[18px] shrink-0 text-pin"
                aria-hidden
              />
              An administrator has turned AI off for your account. Everything
              else still works; ask them if you need it back.
            </p>
          )}
          <Meter used={data.tokens_today} budget={data.daily_budget} />
          <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-3">
            <div>
              <dt className="text-[0.8125rem] text-ink-3">
                Used in the last 24 hours
              </dt>
              <dd className="type-figure text-[1.375rem]">
                {tokens(data.tokens_today)}
              </dd>
            </div>
            <div>
              <dt className="text-[0.8125rem] text-ink-3">Daily allowance</dt>
              <dd className="type-figure text-[1.375rem]">
                {data.daily_budget > 0 ? tokens(data.daily_budget) : "No limit"}
              </dd>
            </div>
            <div>
              <dt className="text-[0.8125rem] text-ink-3">AI requests today</dt>
              <dd className="type-figure text-[1.375rem]">
                {data.calls_today}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-[0.8125rem] text-ink-3">
            Counted in tokens, the pieces of text AI reads and writes. The
            allowance refills as the day rolls on.
          </p>
        </>
      )}
    </Panel>
  );
}

function Meter({ used, budget }: { used: number; budget: number }) {
  const percent = share(used, budget);
  const full = budget > 0 && percent >= 90;
  return (
    <div>
      <div
        role="meter"
        aria-label="AI used today"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={
          budget > 0
            ? `${percent}% of today's allowance`
            : "No daily limit on this account"
        }
        className="relative h-7 overflow-hidden rounded-[6px] border border-line-strong bg-surface-2"
      >
        <motion.div
          className={cn("h-full", full ? "bg-pin" : "bg-tape")}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(90deg,var(--line-strong)_0_1px,transparent_1px_5%)] opacity-70 [mask-image:linear-gradient(to_bottom,black_40%,transparent_40%)]"
        />
      </div>
      <p className="mt-2 text-[0.875rem] text-ink-2">
        {budget > 0
          ? `${percent}% of today's allowance used.`
          : "No daily limit on your account."}
      </p>
    </div>
  );
}
