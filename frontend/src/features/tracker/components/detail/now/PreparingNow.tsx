import { ArrowRight, ArrowUpRight, Send } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { NowShell, type NowProps } from "./NowShell";
import { PrepareFirst } from "./SavedNow";

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: n * 0.07, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-line py-4 first:pt-0 last:border-b-0 last:pb-0"
    >
      <span
        className="type-figure grid size-8 shrink-0 place-items-center rounded-full border-2 border-ink text-[0.875rem]"
        aria-hidden
      >
        {n}
      </span>
      <p className="min-w-[min(100%,12rem)] flex-1 font-semibold">
        <span className="sr-only">Step {n}: </span>
        {title}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </motion.li>
  );
}

/** A running stitch: the application is being written. */
function Stitching() {
  return (
    <div
      aria-hidden
      className="relative mt-5 h-1.5 overflow-hidden rounded-full bg-surface-3"
    >
      <span className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-tape motion-safe:animate-[cv-slide_1.4s_ease-in-out_infinite]" />
    </div>
  );
}

export function PreparingNow({ app, onMove }: NowProps) {
  const kit = app.kit_id;
  if (!kit)
    return (
      <NowShell
        title="Next: prepare your application"
        lead="Tailr writes a CV and cover letter for this job from your real experience."
      >
        <PrepareFirst app={app} />
      </NowShell>
    );
  if (app.kit_status === "building")
    return (
      <NowShell
        tone="wait"
        title="Tailr is writing your application"
        lead="Your CV and cover letter for this job, from your real experience. About a minute. You can leave this page; Tailr will let you know when it's ready."
      >
        <Stitching />
        <Button asChild variant="secondary" className="mt-5">
          <Link to={`/apply/${kit}`}>
            <Spinner className="size-4" label="Writing" />
            Watch it being written
          </Link>
        </Button>
      </NowShell>
    );
  if (app.kit_status === "failed")
    return (
      <NowShell
        title="Preparing didn't finish"
        lead="Open your application to try again. Nothing you wrote is lost."
      >
        <Button asChild variant="tape">
          <Link to={`/apply/${kit}`}>
            Open my application <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Button>
      </NowShell>
    );
  return (
    <NowShell
      title="Your application is ready to send"
      lead="Three steps, and the first one is the most important: make sure every line sounds like you."
    >
      <ol>
        <Step n={1} title="Check your CV and cover letter">
          <Button asChild variant="tape" size="sm">
            <Link to={`/apply/${kit}`}>
              Open my application <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </Step>
        <Step n={2} title="Send it on the job site">
          <Button asChild variant="secondary" size="sm">
            <a href={app.job.url} target="_blank" rel="noopener noreferrer">
              Open the job ad <ArrowUpRight className="size-4" aria-hidden />
            </a>
          </Button>
        </Step>
        <Step n={3} title="Tell Tailr you've applied">
          <Button
            variant="secondary"
            size="sm"
            icon={<Send className="size-3.5" />}
            onClick={() => onMove("applied")}
          >
            I've applied
          </Button>
        </Step>
      </ol>
    </NowShell>
  );
}
