import { Check, FileUser, Radar, Sunrise } from "lucide-react";
import { motion } from "motion/react";
import { FitTape } from "@/components/ui/FitTape";
import { useMe } from "@/features/auth/api";
import { cn } from "@/lib/cn";
import { greeting, longDate } from "@/lib/format";

interface SetupStep {
  title: string;
  body: string;
  icon: typeof FileUser;
  status: "done" | "next" | "later";
}

const SAMPLE_BRIEF = [
  { title: "Senior AI Engineer", company: "Selat Pay", place: "Kuala Lumpur", score: 92, age: "2 hours ago" },
  { title: "ML Platform Engineer", company: "Hijau Energy", place: "Cyberjaya, hybrid", score: 86, age: "5 hours ago" },
  { title: "Data Scientist, GenAI", company: "Rimba Health", place: "Penang", score: 71, age: "Yesterday" },
];

/**
 * Today. Until the first brief exists, this is the setup path; once the
 * profile and radar are ready it becomes the Morning Brief.
 */
export function TodayPage() {
  const { data: user } = useMe();
  const firstName = user?.name.split(" ")[0] ?? "";

  const steps: SetupStep[] = [
    { title: "Create your account", body: "You're in. Welcome to Tailr.", icon: Check, status: "done" },
    {
      title: "Build your profile",
      body: "Upload your CV or start fresh. Tailr turns it into a profile it reuses for every application.",
      icon: FileUser,
      status: "next",
    },
    {
      title: "Set your job radar",
      body: "Roles, places, salary and deal-breakers, plus the time you want your brief.",
      icon: Radar,
      status: "later",
    },
    {
      title: "Read your first brief",
      body: "Fresh jobs from LinkedIn and JobStreet, each measured against your profile.",
      icon: Sunrise,
      status: "later",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[72rem] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-[0.9375rem] text-ink-2">{longDate(new Date())}</p>
        <h1 className="type-display mt-2">
          {greeting(new Date())}
          {firstName ? `, ${firstName}.` : "."}
        </h1>
        <p className="mt-4 max-w-[34rem] text-[1.0625rem] text-ink-2">
          Three short steps and Tailr starts measuring jobs for you every morning.
        </p>
      </motion.header>

      <div className="mt-12 grid gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <section aria-labelledby="setup-heading">
          <h2 id="setup-heading" className="type-heading">
            Your setup
          </h2>
          <ol className="relative mt-6">
            {steps.map((step, index) => (
              <motion.li
                key={step.title}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + index * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="relative flex gap-5 pb-8 last:pb-0"
              >
                {index < steps.length - 1 && (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute left-[1.1875rem] top-11 h-[calc(100%-2.75rem)] w-px",
                      step.status === "done" ? "bg-ink" : "bg-[linear-gradient(var(--line-strong)_55%,transparent_0)] bg-[length:1px_8px]",
                    )}
                  />
                )}
                <span
                  className={cn(
                    "relative grid size-10 shrink-0 place-items-center rounded-full border",
                    step.status === "done" && "border-ink bg-ink text-canvas",
                    step.status === "next" && "border-tape bg-tape text-tape-ink",
                    step.status === "later" && "border-line-strong bg-surface text-ink-3",
                  )}
                >
                  <step.icon className="size-[18px]" aria-hidden />
                </span>
                <div
                  className={cn(
                    "min-w-0 flex-1 rounded-panel pt-1.5",
                    step.status === "next" && "-mt-1 border border-line bg-surface p-5 shadow-sheet",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 className={cn("text-[1.0625rem] font-semibold", step.status === "later" && "text-ink-2")}>
                      {step.title}
                    </h3>
                    {step.status === "next" && (
                      <span className="rounded-full bg-chalk-soft px-2.5 py-0.5 text-[0.75rem] font-semibold text-chalk">
                        Next
                      </span>
                    )}
                  </div>
                  <p className="mt-1 max-w-[34rem] text-ink-2">{step.body}</p>
                  {step.status === "next" && (
                    <p className="mt-4 text-[0.875rem] text-ink-3">
                      The profile builder arrives in the next build of Tailr.
                    </p>
                  )}
                </div>
              </motion.li>
            ))}
          </ol>
        </section>

        <aside aria-labelledby="preview-heading" className="xl:pt-1">
          <h2 id="preview-heading" className="type-heading">
            What your mornings will look like
          </h2>
          <p className="mt-2 text-ink-2">A sample brief. Yours will use your own profile.</p>
          <div className="mt-6 overflow-hidden rounded-panel border border-line bg-surface">
            {SAMPLE_BRIEF.map((job, index) => (
              <div
                key={job.title}
                className={cn("flex flex-col gap-3 p-5", index > 0 && "border-t border-line")}
              >
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <div className="min-w-[min(100%,12rem)] flex-1">
                    <p className="font-semibold">{job.title}</p>
                    <p className="text-[0.875rem] text-ink-2">
                      {job.company}, {job.place}
                    </p>
                  </div>
                  <span className="text-[0.8125rem] text-ink-3">{job.age}</span>
                </div>
                <FitTape score={job.score} size="sm" showLabel />
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
