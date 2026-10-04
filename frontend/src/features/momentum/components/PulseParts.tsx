import { Check, CircleDashed } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Pulse } from "../api";

type Skill = NonNullable<Pulse["skills"]>[number];
type Pay = NonNullable<Pulse["pay"]>;
type Company = NonNullable<Pulse["companies"]>[number];

const money = (amount: number) => amount.toLocaleString("en-MY");

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-panel border border-line bg-surface p-5 sm:p-6">
      <h3 className="type-label text-ink-2">{title}</h3>
      {children}
    </div>
  );
}

/** Each in-demand skill as a bar: how many of this week's jobs require it. */
export function SkillDemand({ skills }: { skills: Skill[] }) {
  return (
    <Card title="Skills they ask for">
      {skills.length === 0 ? (
        <p className="mt-2 text-ink-2">
          This week's ads didn't name clear skills.
        </p>
      ) : (
        <>
          <p className="mt-1 text-[0.8125rem] text-ink-3">
            Share of this week's jobs that require each one.
          </p>
          <ul className="mt-4 flex flex-col gap-3.5">
            {skills.map((skill, index) => (
              <li key={skill.name}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="flex flex-wrap items-center gap-x-1.5">
                    {skill.have ? (
                      <Check
                        className="size-4 shrink-0 text-fit-strong"
                        aria-hidden
                      />
                    ) : (
                      <CircleDashed
                        className="size-4 shrink-0 text-tape-deep"
                        aria-hidden
                      />
                    )}
                    <span className="font-medium">{skill.name}</span>
                    <span className="text-[0.8125rem] text-ink-3">
                      {skill.have ? "on your profile" : "worth learning"}
                    </span>
                  </span>
                  <span className="type-figure text-[0.9375rem]">
                    {skill.share}%
                  </span>
                </div>
                <div
                  aria-hidden
                  className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-3"
                >
                  <motion.div
                    className={cn(
                      "h-full rounded-full",
                      skill.have ? "bg-ink" : "bg-tape",
                    )}
                    style={{ originX: 0, width: `${skill.share}%` }}
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.6,
                      delay: index * 0.05,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

function compare(minimum: number, pay: Pay): string {
  const yours = `Your minimum pay, RM ${money(minimum)},`;
  if (minimum < pay.low) return `${yours} is below this range.`;
  if (minimum > pay.high)
    return `${yours} is above this range, so fewer jobs will meet it.`;
  return `${yours} sits inside this range.`;
}

export function PayRange({
  pay,
  minimum,
}: {
  pay: Pay | null;
  minimum: number | null;
}) {
  return (
    <Card title="Typical pay">
      {pay ? (
        <>
          <p className="type-figure mt-2 text-[1.75rem] leading-tight">
            RM {money(pay.low)}
            {pay.high !== pay.low && <> – {money(pay.high)}</>}
          </p>
          <p className="mt-1 text-[0.875rem] text-ink-2">
            a month, from {pay.jobs} {pay.jobs === 1 ? "ad" : "ads"} that state
            pay
          </p>
          {minimum ? (
            <p className="mt-3 text-[0.875rem] text-ink-2">
              {compare(minimum, pay)}
            </p>
          ) : null}
        </>
      ) : (
        <p className="mt-2 text-ink-2">
          Too few ads stated pay this week to say.
        </p>
      )}
    </Card>
  );
}

const MODES = [
  { key: "onsite", label: "On-site", swatch: "bg-ink" },
  { key: "hybrid", label: "Hybrid", swatch: "bg-chalk" },
  { key: "remote", label: "Remote", swatch: "bg-fit-strong" },
  { key: "unknown", label: "Not stated", swatch: "bg-line-strong" },
] as const;

export function WorkModes({
  modes,
  total,
}: {
  modes: Record<string, number>;
  total: number;
}) {
  const shown = MODES.filter((mode) => (modes[mode.key] ?? 0) > 0);
  const described = shown
    .map((mode) => `${mode.label} ${modes[mode.key]}`)
    .join(", ");
  return (
    <Card title="Where you'd work">
      <div
        role="img"
        aria-label={`Work mode of ${total} jobs: ${described}`}
        className="mt-3 flex h-3 gap-[2px] overflow-hidden rounded-full"
      >
        {shown.map((mode) => (
          <span
            key={mode.key}
            className={cn("h-full", mode.swatch)}
            style={{ width: `${((modes[mode.key] ?? 0) / total) * 100}%` }}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[0.875rem]">
        {shown.map((mode) => (
          <li key={mode.key} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={cn("size-2.5 shrink-0 rounded-full", mode.swatch)}
            />
            {mode.label}
            <span className="type-figure text-ink-2">{modes[mode.key]}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function CompaniesHiring({ companies }: { companies: Company[] }) {
  if (companies.length === 0) return null;
  return (
    <Card title="Hiring the most">
      <ol className="mt-2 flex flex-col divide-y divide-line">
        {companies.map((company) => (
          <li
            key={company.name}
            className="flex items-baseline justify-between gap-3 py-2"
          >
            <span className="min-w-0 font-medium">{company.name}</span>
            <span className="type-figure shrink-0 text-[0.875rem] text-ink-2">
              {company.jobs} {company.jobs === 1 ? "job" : "jobs"}
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
