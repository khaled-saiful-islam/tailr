import { CircleAlert } from "lucide-react";
import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useKit, type Kit } from "./api";
import { KitBuilding } from "./components/KitBuilding";
import { KitHeader } from "./components/KitHeader";
import { KitWorkspace } from "./components/KitWorkspace";
import { WritingCard } from "./components/WritingCard";

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
      <KitHeader kit={kit} />

      {kit.status !== "ready" && (
        <div className="mt-8 flex flex-col gap-6">
          <WritingCard
            key={`${kit.language}-${kit.tone}-${kit.status}`}
            kit={kit}
          />
          {kit.status === "building" && <KitBuilding stage={kit.stage} />}
          {kit.status === "failed" && <KitFailed kit={kit} />}
        </div>
      )}
      {kit.status === "ready" && <KitWorkspace kit={kit} reload={reload} />}
    </div>
  );
}

function KitFailed({ kit }: { kit: Kit }) {
  return (
    <div
      role="alert"
      className="flex gap-3 rounded-panel border border-pin/40 bg-pin-soft p-5"
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
