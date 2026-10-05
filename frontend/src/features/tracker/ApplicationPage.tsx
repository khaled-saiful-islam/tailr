import { Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import {
  useApplication,
  useRemoveApplication,
  type ApplicationDetail,
} from "./api";
import { DetailsForm } from "./components/DetailsForm";
import { Disclosure } from "./components/detail/Disclosure";
import { AboutJob, JobHeader } from "./components/detail/JobHeader";
import { Journey } from "./components/detail/Journey";
import { NowCard } from "./components/detail/NowCard";
import { History } from "./components/History";
import { useFieldSave, type SaveState } from "./useFieldSave";
import { useMove } from "./useMove";

const SAVE_TEXT: Record<SaveState, string> = {
  idle: "",
  saving: "Saving",
  saved: "Saved",
  error: "Not saved",
};

const EASE = [0.22, 1, 0.36, 1] as const;

function Remove({ app }: { app: ApplicationDetail }) {
  const [sure, setSure] = useState(false);
  const remove = useRemoveApplication();
  const navigate = useNavigate();
  if (!sure)
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
              navigate("/applications");
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

/** Notes and contact matter once it's sent; before that they wait, folded away. */
function hasDetails(app: ApplicationDetail): boolean {
  return Boolean(app.notes || app.contact_name || app.contact_email);
}

function Loaded({ app }: { app: ApplicationDetail }) {
  const move = useMove();
  const { save, state } = useFieldSave(app.id);
  const early = app.stage === "saved" || app.stage === "preparing";
  const onMove = (stage: Parameters<typeof move>[1]) => move(app, stage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="mx-auto w-full max-w-[72rem] px-5 py-8 sm:px-8 lg:px-10 lg:py-10"
    >
      <JobHeader app={app} />
      <div className="mt-7">
        <Journey app={app} onMove={onMove} />
      </div>
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <NowCard app={app} onMove={onMove} save={save} />
          <Disclosure
            title="Notes and contact"
            summary={
              early
                ? "Optional. Useful once you've applied."
                : "Who you're talking to, and anything worth remembering."
            }
            defaultOpen={!early && hasDetails(app)}
          >
            <DetailsForm
              app={app}
              save={save}
              withNextStep={app.stage === "applied" || app.stage === "offer"}
            />
          </Disclosure>
          <p
            className="-mt-2 min-h-5 px-1 text-[0.8125rem] text-ink-3"
            aria-live="polite"
          >
            {SAVE_TEXT[state]}
          </p>
          {app.events.length > 0 && (
            <Disclosure
              title="History"
              summary={`${app.events.length} ${app.events.length === 1 ? "update" : "updates"}, newest first.`}
            >
              <History events={app.events} />
            </Disclosure>
          )}
          {!early && (
            <div>
              <Remove app={app} />
            </div>
          )}
        </div>
        <aside className="lg:sticky lg:top-6">
          <AboutJob app={app} />
        </aside>
      </div>
    </motion.div>
  );
}

/** One application, on its own page: what it is, where it stands, and what to do now. */
export function ApplicationPage() {
  const { applicationId = "" } = useParams();
  const query = useApplication(applicationId);
  if (query.isPending)
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Spinner className="size-7 text-ink-3" />
      </div>
    );
  if (query.isError)
    return (
      <div className="mx-auto max-w-[40rem] px-5 py-16 text-center">
        <h1 className="type-heading">We couldn't open that application</h1>
        <p className="mt-2 text-ink-2">{query.error.message}</p>
        <Button asChild variant="secondary" className="mt-6">
          <Link to="/applications">Back to My applications</Link>
        </Button>
      </div>
    );
  return <Loaded key={query.data.id} app={query.data} />;
}
