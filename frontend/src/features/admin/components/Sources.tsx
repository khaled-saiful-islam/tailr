import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { relativeTime } from "@/lib/format";
import type { Overview } from "../api";
import { sourceLabel, sourceTone } from "../format";

const TONE = {
  good: { label: "Healthy", icon: CircleCheck, className: "text-fit-strong" },
  warn: {
    label: "Worth a look",
    icon: TriangleAlert,
    className: "text-fit-stretch",
  },
  bad: { label: "Failing", icon: CircleAlert, className: "text-pin" },
} as const;

/** Each job site's searches in the last 24 hours: did they work, and did they find anything? */
export function Sources({ sources }: { sources: Overview["sources"] }) {
  if (!sources.length)
    return (
      <p className="text-[0.9375rem] text-ink-3">
        No job-site searches in the last 24 hours. Tailr searches during each
        daily job update.
      </p>
    );
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {sources.map((source) => {
        const tone = TONE[sourceTone(source)];
        return (
          <li
            key={source.source}
            className="rounded-control border border-line bg-surface p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{sourceLabel(source.source)}</p>
              <p
                className={cn(
                  "flex items-center gap-1.5 text-[0.875rem] font-medium",
                  tone.className,
                )}
              >
                <tone.icon className="size-4" aria-hidden />
                {tone.label}
              </p>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-[0.8125rem]">
              {[
                { label: "Searches", value: source.runs },
                { label: "Failed", value: source.failed },
                { label: "Found none", value: source.empty },
              ].map((item) => (
                <div key={item.label}>
                  <dt className="text-ink-3">{item.label}</dt>
                  <dd className="type-figure text-[1.125rem] text-ink">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[0.8125rem] text-ink-2">
              {source.last_ok_at
                ? `Last found jobs ${relativeTime(source.last_ok_at)}`
                : "Hasn't found jobs recently"}
            </p>
            {source.last_error && (
              <p className="mt-1 text-[0.8125rem] text-ink-3">
                Last error: {source.last_error}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
