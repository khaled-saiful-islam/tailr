import { ArrowUpRight, Trash2, X } from "lucide-react";
import { Dialog as RadixDialog } from "radix-ui";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import {
  useApplication,
  useRemoveApplication,
  type ApplicationDetail,
} from "../api";
import { STAGE_LABEL, type Stage } from "../stages";
import { useFieldSave, type SaveState } from "../useFieldSave";
import { CompanyMark } from "./AppCard";
import { DetailsForm } from "./DetailsForm";
import { FollowUp } from "./FollowUp";
import { History } from "./History";
import { StageStepper } from "./StageStepper";

const SAVE_TEXT: Record<SaveState, string> = {
  idle: "",
  saving: "Saving",
  saved: "Saved",
  error: "Not saved",
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line px-5 py-5 sm:px-6">
      <h3 className="type-label mb-3 text-ink-2">{title}</h3>
      {children}
    </section>
  );
}

function Remove({
  app,
  onDone,
}: {
  app: ApplicationDetail;
  onDone: () => void;
}) {
  const [sure, setSure] = useState(false);
  const remove = useRemoveApplication();
  if (!sure) {
    return (
      <Button
        variant="ghost"
        size="sm"
        icon={<Trash2 className="size-3.5" />}
        onClick={() => setSure(true)}
      >
        Remove from My applications
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2" role="alert">
      <span className="text-[0.875rem]">Remove it, with its notes?</span>
      <Button
        variant="danger"
        size="sm"
        loading={remove.isPending}
        onClick={() =>
          remove.mutate(app.id, {
            onSuccess: () => {
              toast("Removed from My applications.");
              onDone();
            },
            onError: (error) => toast.error(error.message),
          })
        }
      >
        Remove
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setSure(false)}>
        Keep it
      </Button>
    </div>
  );
}

function Body({
  app,
  onMove,
  onClose,
}: {
  app: ApplicationDetail;
  onMove: (stage: Stage) => void;
  onClose: () => void;
}) {
  const { save, state } = useFieldSave(app.id);
  const links = [
    { to: app.job.url, label: "Job ad", external: true },
    app.match_id && { to: `/jobs/${app.match_id}`, label: "Job details" },
    app.kit_id && { to: `/apply/${app.kit_id}`, label: "Your application" },
  ].filter(Boolean) as { to: string; label: string; external?: boolean }[];

  return (
    <>
      <div className="px-5 pb-5 sm:px-6">
        <div className="flex items-start gap-3">
          <CompanyMark
            company={app.job.company}
            className="size-11 text-[0.875rem]"
          />
          <div className="min-w-0">
            <RadixDialog.Title className="type-heading leading-snug">
              {app.job.title}
            </RadixDialog.Title>
            <RadixDialog.Description className="mt-0.5 text-ink-2">
              {[app.job.company, app.job.location].filter(Boolean).join(", ")}
            </RadixDialog.Description>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.9375rem]">
          {links.map((link) =>
            link.external ? (
              <a
                key={link.label}
                href={link.to}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-chalk hover:underline"
              >
                {link.label} <ArrowUpRight className="size-3.5" aria-hidden />
              </a>
            ) : (
              <Link
                key={link.label}
                to={link.to}
                className="font-medium text-chalk hover:underline"
              >
                {link.label}
              </Link>
            ),
          )}
        </div>
      </div>

      <Section title="Where it stands">
        <StageStepper
          stage={app.stage}
          applied={Boolean(app.applied_at)}
          onChange={onMove}
        />
      </Section>
      {app.stage === "applied" && (
        <Section title="Follow up">
          <FollowUp app={app} />
        </Section>
      )}
      <Section title="Details">
        <DetailsForm app={app} save={save} />
        <p
          className="mt-3 min-h-5 text-[0.8125rem] text-ink-3"
          aria-live="polite"
        >
          {SAVE_TEXT[state]}
        </p>
      </Section>
      <Section title="History">
        <History events={app.events} />
      </Section>
      <div className="border-t border-line px-5 py-4 sm:px-6">
        <Remove app={app} onDone={onClose} />
      </div>
    </>
  );
}

/** One application, opened from the board: a sheet from the right (full screen on phones). */
export function ApplicationSheet({
  id,
  onClose,
  onMove,
}: {
  id: string | null;
  onClose: () => void;
  onMove: (id: string, stage: Stage) => void;
}) {
  const query = useApplication(id);
  return (
    <RadixDialog.Root
      open={Boolean(id)}
      onOpenChange={(open) => !open && onClose()}
    >
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-overlay backdrop-blur-[2px] data-[state=open]:animate-[tailr-fade_160ms_ease-out]" />
        <RadixDialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[36rem] flex-col border-l border-line bg-surface shadow-sheet data-[state=open]:animate-[tailr-sheet-in_240ms_cubic-bezier(0.22,1,0.36,1)]"
        >
          <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4 sm:px-6">
            <span className="text-[0.875rem] text-ink-3">
              {query.data ? STAGE_LABEL[query.data.stage] : "Application"}
            </span>
            <RadixDialog.Close
              aria-label="Close"
              className="-mr-2 grid size-10 place-items-center rounded-[9px] text-ink-3 hover:bg-surface-2 hover:text-ink"
            >
              <X className="size-5" aria-hidden />
            </RadixDialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
            {query.data ? (
              <Body
                key={query.data.id}
                app={query.data}
                onMove={(stage) => onMove(query.data.id, stage)}
                onClose={onClose}
              />
            ) : query.isError ? (
              <div className="px-6 py-10">
                <RadixDialog.Title className="type-heading">
                  We couldn't open that application
                </RadixDialog.Title>
                <p className="mt-2 text-ink-2">{query.error.message}</p>
              </div>
            ) : (
              <div className="grid place-items-center py-24">
                <RadixDialog.Title className="sr-only">
                  Loading
                </RadixDialog.Title>
                <Spinner className="size-6 text-ink-3" />
              </div>
            )}
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
