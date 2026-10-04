import { Check } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/Button";
import { useMe } from "@/features/auth/api";
import { cn } from "@/lib/cn";
import { greeting } from "@/lib/format";
import { ExampleJobs, HowItWorks } from "./HowItWorks";

type Status = "done" | "next" | "later";

interface Step {
  title: string;
  body: string;
  status: Status;
  action?: ReactNode;
}

function StepMark({ number, status }: { number: number; status: Status }) {
  return (
    <span
      className={cn(
        "relative grid size-10 shrink-0 place-items-center rounded-full border text-[1rem] font-semibold",
        status === "done" && "border-ink bg-ink text-canvas",
        status === "next" && "border-tape bg-tape text-tape-ink",
        status === "later" && "border-line-strong bg-surface text-ink-3",
      )}
    >
      {status === "done" ? (
        <Check className="size-[18px]" strokeWidth={3} aria-hidden />
      ) : (
        <span className="type-figure">{number}</span>
      )}
      <span className="sr-only">
        {status === "done" ? ", done" : status === "next" ? ", next" : ""}
      </span>
    </span>
  );
}

/** Home for a new account: three steps to your first jobs, and how Tailr works. */
export function SetupView() {
  const { data: user } = useMe();
  const firstName = user?.name.split(" ")[0] ?? "";
  const stage = user?.onboarding_step ?? "import";
  const cvDone = stage === "radar" || stage === "done";

  const steps: Step[] = [
    {
      title: "Add your CV",
      body: cvDone
        ? "Your CV is in. Change it any time under Profile."
        : "Upload your CV, or type it in. Tailr reads it once and uses it to match jobs and write your applications.",
      status: cvDone ? "done" : "next",
      action: cvDone ? undefined : (
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/profile/import">
              {stage === "review"
                ? "Finish checking your CV"
                : "Upload your CV"}
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/profile">Start from scratch</Link>
          </Button>
        </div>
      ),
    },
    {
      title: "Tell Tailr what job you want",
      body: "The roles, places and pay you're after. Tailr only looks for jobs like these.",
      status: cvDone ? "next" : "later",
      action: cvDone ? (
        <Button asChild>
          <Link to="/preferences">Set my job preferences</Link>
        </Button>
      ) : undefined,
    },
    {
      title: "See your jobs",
      body: "Tailr searches LinkedIn and JobStreet and shows every job on your Jobs page, best match first. It searches again every morning.",
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
        <h1 className="type-display">
          {greeting(new Date())}
          {firstName ? `, ${firstName}.` : "."}
        </h1>
        <p className="mt-4 max-w-[36rem] text-[1.125rem] leading-relaxed text-ink-2">
          Let's find you a job. Three steps, about five minutes, and Tailr
          starts bringing you jobs that match.
        </p>
      </motion.header>

      <div className="mt-10 grid gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <section aria-labelledby="start-heading">
          <h2 id="start-heading" className="type-heading">
            Get started
          </h2>
          <ol className="mt-5 flex flex-col gap-4">
            {steps.map((step, index) => (
              <motion.li
                key={step.title}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: 0.15 + index * 0.08,
                  duration: 0.45,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={cn(
                  "flex gap-4 rounded-panel border p-5",
                  step.status === "next"
                    ? "border-line bg-surface shadow-sheet"
                    : "border-transparent",
                )}
              >
                <StepMark number={index + 1} status={step.status} />
                <div className="min-w-0 flex-1 pt-1.5">
                  <h3
                    className={cn(
                      "text-[1.125rem] font-semibold",
                      step.status === "later" && "text-ink-2",
                    )}
                  >
                    {step.title}
                  </h3>
                  <p className="mt-1 max-w-[36rem] text-ink-2">{step.body}</p>
                  {step.action && <div className="mt-4">{step.action}</div>}
                </div>
              </motion.li>
            ))}
          </ol>
        </section>

        <div className="flex flex-col gap-10">
          <HowItWorks />
          <ExampleJobs />
        </div>
      </div>
    </div>
  );
}
