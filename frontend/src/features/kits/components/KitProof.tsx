import { Check, ChevronDown, CircleDashed, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import type { Kit } from "../api";
import { splitIssues } from "../status";

export function TruthCheck({
  check,
}: {
  check: NonNullable<Kit["fact_check"]>;
}) {
  const [open, setOpen] = useState(false);
  const { issues, skillsRemoved } = splitIssues(check);
  return (
    <section
      aria-labelledby="truth-heading"
      className="rounded-control bg-surface-2 p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <ShieldCheck
          className="mt-0.5 size-5 shrink-0 text-fit-strong"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <h3 id="truth-heading" className="font-semibold">
            Checked against your profile
          </h3>
          <p className="mt-1 text-[0.9375rem] text-ink-2">
            Every line comes from your CV ({check.lines_checked} checked).{" "}
            {issues.length === 0
              ? "Nothing was added that isn't yours."
              : `We fixed ${issues.length} ${issues.length === 1 ? "line" : "lines"} that didn't match, using your own words.`}
          </p>
          {skillsRemoved.length > 0 && (
            <p className="mt-2 text-[0.9375rem] text-ink-2">
              {skillsRemoved.length === 1
                ? "1 skill from the ad was left off because it isn't in your profile."
                : `${skillsRemoved.length} skills from the ad were left off because they aren't in your profile.`}
            </p>
          )}
          {issues.length > 0 && (
            <>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className="mt-3 inline-flex items-center gap-1 text-[0.875rem] font-semibold text-chalk hover:underline"
              >
                {open ? "Hide the corrections" : "See the corrections"}
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform",
                    open && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>
              {open && (
                <ul className="mt-3 flex flex-col gap-3">
                  {issues.map((issue, index) => (
                    <li
                      key={index}
                      className="rounded-control bg-surface px-3.5 py-3 text-[0.875rem]"
                    >
                      <p className="font-medium">{issue.problem}</p>
                      <p className="mt-1 text-ink-3 line-through decoration-pin/60">
                        {issue.original}
                      </p>
                      <p className="mt-1 text-ink-2">
                        {issue.replaced_with
                          ? issue.replaced_with
                          : "Removed: there was no fact to fall back on."}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export function Keywords({ report }: { report: NonNullable<Kit["keywords"]> }) {
  const covered = report.covered ?? [];
  const missing = report.missing ?? [];
  const gain = report.after - report.before;
  return (
    <section
      aria-labelledby="keywords-heading"
      className="rounded-control bg-surface-2 p-4 sm:p-5"
    >
      <h3 id="keywords-heading" className="font-semibold">
        Uses the job's keywords
      </h3>
      <p className="mt-1 text-[0.9375rem] text-ink-2">
        {gain > 0
          ? `Your CV now mentions ${report.after}% of the skills this ad asks for, up from ${report.before}%.`
          : `Your CV mentions ${report.after}% of the skills this ad asks for.`}
      </p>
      <div className="mt-4 flex flex-col gap-2" aria-hidden>
        <Bar label="Before" value={report.before} className="bg-ink-3/45" />
        <Bar
          label="Now"
          value={report.after}
          className="bg-tape"
          delay={0.25}
        />
      </div>
      {(covered.length > 0 || missing.length > 0) && (
        <ul
          className="mt-4 flex flex-wrap gap-1.5"
          aria-label="Skills the ad asks for"
        >
          {covered.map((skill) => (
            <li
              key={skill}
              className="flex items-center gap-1 rounded-full border border-fit-strong/40 px-2.5 py-0.5 text-[0.8125rem]"
            >
              <Check
                className="size-3 text-fit-strong"
                aria-label="On your CV"
              />
              {skill}
            </li>
          ))}
          {missing.map((skill) => (
            <li
              key={skill}
              className="flex items-center gap-1 rounded-full border border-dashed border-fit-stretch/60 px-2.5 py-0.5 text-[0.8125rem] text-ink-2"
            >
              <CircleDashed
                className="size-3 text-fit-stretch"
                aria-label="Not in your profile"
              />
              {skill}
            </li>
          ))}
        </ul>
      )}
      {missing.length > 0 && (
        <p className="mt-3 text-[0.8125rem] text-ink-3">
          Dashed skills aren't in your profile, so Tailr didn't claim them. If
          you have them, add them to your profile and write it again.
        </p>
      )}
    </section>
  );
}

function Bar({
  label,
  value,
  className,
  delay = 0,
}: {
  label: string;
  value: number;
  className: string;
  delay?: number;
}) {
  return (
    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_2.75rem] items-center gap-3 text-[0.8125rem]">
      <span className="text-ink-3">{label}</span>
      <div className="h-2 overflow-hidden rounded-full bg-surface-3">
        <motion.div
          className={cn("h-full rounded-full", className)}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <span className="type-figure text-right">{value}%</span>
    </div>
  );
}
