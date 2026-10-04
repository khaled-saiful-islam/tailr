import { Check, Copy, Download, ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { documentUrl, type Kit } from "../api";
import { siteName } from "../options";
import { AppliedAction } from "./AppliedAction";

function Step({
  number,
  title,
  text,
  done = false,
  children,
}: {
  number: number;
  title: string;
  text: string;
  done?: boolean;
  children: ReactNode;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-full border-2 text-[0.875rem] font-semibold",
            done
              ? "border-fit-strong bg-fit-strong text-white"
              : "border-ink text-ink",
          )}
        >
          {done ? <Check className="size-4" /> : number}
        </span>
        <div className="min-w-0">
          <h3 className="font-semibold leading-snug">
            <span className="sr-only">
              Step {number}
              {done ? ", done" : ""}:{" "}
            </span>
            {title}
          </h3>
          <p className="mt-0.5 text-[0.875rem] text-ink-2">{text}</p>
        </div>
      </div>
      <div className="mt-auto flex flex-wrap gap-2">{children}</div>
    </li>
  );
}

function DownloadLink({
  busy,
  href,
  children,
  primary = false,
}: {
  busy: boolean;
  href: string;
  children: ReactNode;
  primary?: boolean;
}) {
  if (busy)
    return (
      <Button size="sm" variant={primary ? "tape" : "secondary"} loading>
        {children}
      </Button>
    );
  return (
    <Button size="sm" variant={primary ? "tape" : "secondary"} asChild>
      <a href={href} download>
        <Download className="size-3.5" aria-hidden />
        {children}
      </a>
    </Button>
  );
}

/** What to do with a prepared application, in order. */
export function ApplySteps({
  kit,
  busy,
  onOpen,
  onCopyLetter,
}: {
  kit: Kit;
  busy: boolean;
  onOpen: (tab: "resume" | "letter") => void;
  onCopyLetter: () => void;
}) {
  const site = siteName(kit.job_url);
  const applied =
    kit.application !== null &&
    kit.application !== undefined &&
    !["saved", "preparing"].includes(kit.application.stage);
  return (
    <section aria-labelledby="steps-heading" className="mt-6">
      <h2 id="steps-heading" className="type-heading">
        Four steps to apply
      </h2>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Step
          number={1}
          title="Check your CV"
          text="Read it below and change anything. Then download it."
        >
          <DownloadLink
            busy={busy}
            href={documentUrl(kit.id, "resume", "pdf")}
            primary
          >
            Download CV (PDF)
          </DownloadLink>
          <Button size="sm" variant="ghost" onClick={() => onOpen("resume")}>
            Read it
          </Button>
        </Step>
        <Step
          number={2}
          title="Check your cover letter"
          text="Make it sound like you. Copy it or download it."
        >
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onOpen("letter")}
          >
            Open it
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={<Copy className="size-3.5" />}
            onClick={onCopyLetter}
          >
            Copy text
          </Button>
          <DownloadLink busy={busy} href={documentUrl(kit.id, "letter", "pdf")}>
            PDF
          </DownloadLink>
        </Step>
        <Step
          number={3}
          title={`Apply on ${site}`}
          text="Attach your CV, and paste the cover letter if they ask for one."
        >
          {kit.job_url.startsWith("http") ? (
            <Button size="sm" variant="secondary" asChild>
              <a href={kit.job_url} target="_blank" rel="noreferrer">
                Open the job ad
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            </Button>
          ) : (
            <span className="text-[0.875rem] text-ink-3">
              Use the link you applied with.
            </span>
          )}
        </Step>
        <Step
          number={4}
          title="Mark as applied"
          text="Tailr reminds you to follow up after a week."
          done={applied}
        >
          <AppliedAction kit={kit} />
        </Step>
      </ol>
    </section>
  );
}
