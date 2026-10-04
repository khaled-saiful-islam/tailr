import { CircleAlert, ScanText } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { useApplyImport, useImport, useProfile } from "../api";
import { ReadingStatus } from "../components/ReadingStatus";
import { ResumePreview } from "../components/ResumePreview";
import {
  ScanningDocument,
  type ScanStage,
} from "../components/ScanningDocument";
import { normalize, type ImportOut } from "../types";

const FINAL = new Set<ImportOut["status"]>(["ready", "failed", "applied"]);

/** Where the import is, in the scanner's terms. */
function scanStage(status: ImportOut["status"] | undefined): ScanStage {
  if (status === "understanding") return "understanding";
  if (status === "ready" || status === "applied") return "done";
  return status ? "reading" : "uploading";
}

export function ImportProgressPage() {
  const { importId = "" } = useParams();
  const query = useImport(importId);
  const profile = useProfile();
  const apply = useApplyImport();
  const navigate = useNavigate();
  const item = query.data;

  const save = (mode: "replace" | "merge") =>
    apply.mutate(
      { id: importId, mode },
      {
        onSuccess: () => {
          toast.success(
            mode === "merge" ? "Added to your profile" : "Profile saved",
          );
          navigate("/profile", { replace: true });
        },
        onError: (error) => toast.error(error.message),
      },
    );

  if (query.isError) {
    return (
      <Shell>
        <Problem message={query.error.message} />
      </Shell>
    );
  }
  if (!item || !FINAL.has(item.status)) {
    const stage = scanStage(item?.status);
    return (
      <Shell>
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <ReadingStatus
            stage={stage}
            filename={item?.filename}
            startedAt={item?.created_at}
            scanned={item?.used_vision}
          />
          <div className="pattern-paper rounded-sheet border border-line py-4 sm:py-6">
            <ScanningDocument stage={stage} />
          </div>
        </div>
      </Shell>
    );
  }

  const ready = item.status === "ready";
  const failed = item.status === "failed";
  const draft = item.draft ? normalize(item.draft) : null;
  const hasProfile = profile.data?.exists ?? false;

  return (
    <Shell>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="flex flex-col">
          <h1 className="type-title">
            {ready
              ? "Check what Tailr found"
              : failed
                ? "We couldn't read that CV"
                : "Reading your CV…"}
          </h1>
          <p className="mt-3 text-ink-2 [overflow-wrap:anywhere]">
            {item.filename}
          </p>

          {failed && (
            <Problem message={item.error ?? "Something went wrong."} />
          )}

          {item.used_vision && ready && (
            <p className="mt-6 flex gap-2.5 rounded-control bg-chalk-soft px-4 py-3 text-[0.9375rem] text-ink">
              <ScanText
                className="mt-0.5 size-4 shrink-0 text-chalk"
                aria-hidden
              />
              Your file was a scan, so Tailr read it like a person would. Check
              names and numbers carefully.
            </p>
          )}

          <AnimatePresence>
            {ready && item.stats && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8"
              >
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ["Roles", item.stats.experiences],
                    ["Achievements", item.stats.achievements],
                    ["Skills", item.stats.skills],
                    ["Qualifications", item.stats.education],
                  ].map(([label, value], index) => (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + index * 0.07 }}
                      className="rounded-panel border border-line bg-surface px-4 py-3"
                    >
                      <dd className="type-figure text-[1.75rem] leading-none">
                        {value}
                      </dd>
                      <dt className="mt-1.5 text-[0.8125rem] text-ink-2">
                        {label}
                      </dt>
                    </motion.div>
                  ))}
                </dl>
                <p className="mt-6 text-ink-2">
                  Check the page on the right. Anything you change later is
                  saved as you type.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  {hasProfile ? (
                    <>
                      <Button
                        size="lg"
                        loading={
                          apply.isPending && apply.variables?.mode === "merge"
                        }
                        onClick={() => save("merge")}
                      >
                        Add to my profile
                      </Button>
                      <Button
                        size="lg"
                        variant="secondary"
                        loading={
                          apply.isPending && apply.variables?.mode === "replace"
                        }
                        onClick={() => save("replace")}
                      >
                        Replace my profile
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="lg"
                      loading={apply.isPending}
                      onClick={() => save("replace")}
                    >
                      Save to my profile
                    </Button>
                  )}
                  <Button size="lg" variant="ghost" asChild>
                    <Link to="/profile/import">Upload a different file</Link>
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="pattern-paper rounded-sheet border border-line p-4 sm:p-8">
          {draft ? (
            <motion.div
              initial={{ opacity: 0, y: 16, rotate: -1 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <ResumePreview doc={draft} />
            </motion.div>
          ) : (
            <ScanningDocument stage="uploading" still />
          )}
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[76rem] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      {children}
    </div>
  );
}

function Problem({ message }: { message: string }) {
  return (
    <div className="mt-8">
      <p
        role="alert"
        className="flex gap-2.5 rounded-control border border-pin/30 bg-pin-soft px-4 py-3 text-ink"
      >
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-pin" aria-hidden />
        {message}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/profile/import">Try another file</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/profile">Fill it in myself</Link>
        </Button>
      </div>
    </div>
  );
}
