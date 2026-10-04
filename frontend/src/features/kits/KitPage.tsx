import { ArrowLeft, CircleAlert, ExternalLink } from "lucide-react";
import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { FitTape } from "@/components/ui/FitTape";
import { Spinner } from "@/components/ui/Spinner";
import { useKit, type Kit } from "./api";
import { KitBuilding } from "./components/KitBuilding";
import { KitWorkspace } from "./components/KitWorkspace";
import { TailorSettings } from "./components/TailorSettings";

/** One job's prepared application: CV, cover letter, answers and interview prep. */
export function KitPage() {
  const { kitId = "" } = useParams();
  const query = useKit(kitId);

  if (query.isPending) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Spinner className="size-7 text-ink-3" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <div className="mx-auto max-w-[40rem] px-5 py-16 text-center">
        <p className="text-ink-2">{query.error.message}</p>
        <Button asChild variant="secondary" className="mt-6">
          <Link to="/jobs">Back to jobs</Link>
        </Button>
      </div>
    );
  }
  const kit = query.data;
  const reload = async () => (await query.refetch()).data;

  return (
    <div className="mx-auto w-full max-w-[84rem] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
      <Link
        to={kit.match_id ? `/jobs/${kit.match_id}` : "/jobs"}
        className="inline-flex items-center gap-1.5 text-[0.9375rem] font-medium text-ink-2 hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> Job details
      </Link>

      <header className="mt-6 flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="min-w-[min(100%,20rem)] flex-1">
          <p className="text-[0.9375rem] font-medium text-ink-2">
            Your application
          </p>
          <h1 className="type-title mt-1">
            {kit.job_title}{" "}
            <span className="font-normal text-ink-2">at {kit.company}</span>
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[1.125rem] font-medium">
            {kit.job_url.startsWith("http") && (
              <a
                href={kit.job_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[0.9375rem] font-semibold text-chalk hover:underline"
              >
                View the ad <ExternalLink className="size-3.5" aria-hidden />
              </a>
            )}
          </p>
        </div>
        {kit.score !== null && <FitTape score={kit.score} showLabel />}
      </header>

      {kit.status !== "building" && (
        <div className="mt-6">
          <TailorSettings
            key={`${kit.language}-${kit.tone}-${kit.status}`}
            kit={kit}
          />
        </div>
      )}

      {kit.status === "building" && (
        <div className="mt-8">
          <KitBuilding stage={kit.stage} />
        </div>
      )}
      {kit.status === "failed" && <KitFailed kit={kit} />}
      {kit.status === "ready" && <KitWorkspace kit={kit} reload={reload} />}
    </div>
  );
}

function KitFailed({ kit }: { kit: Kit }) {
  return (
    <div
      role="alert"
      className="mt-6 flex gap-3 rounded-panel border border-pin/40 bg-pin-soft p-5"
    >
      <CircleAlert className="mt-0.5 size-5 shrink-0 text-pin" aria-hidden />
      <div>
        <p className="font-semibold">Tailr couldn't finish this application.</p>
        <p className="mt-1 text-ink-2">
          {kit.error ?? "Something went wrong while writing it."} Press Write it
          again above to try once more.
        </p>
      </div>
    </div>
  );
}
