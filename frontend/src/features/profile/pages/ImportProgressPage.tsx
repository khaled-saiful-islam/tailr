import { Check, CircleAlert, ScanText } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import { useApplyImport, useImport, useProfile } from "../api";
import { ResumePreview } from "../components/ResumePreview";
import { normalize, type ImportOut } from "../types";

type Stage = { key: string; label: string; detail: string };

const STAGES: Stage[] = [
  { key: "queued", label: "Uploaded", detail: "Your file is safely stored." },
  {
    key: "reading",
    label: "Reading your CV",
    detail: "Pulling out every line of text.",
  },
  {
    key: "understanding",
    label: "Understanding your experience",
    detail: "Sorting roles, achievements and skills.",
  },
  {
    key: "ready",
    label: "Ready to review",
    detail: "Check it, then save it to your profile.",
  },
];

const ORDER = ["queued", "reading", "understanding", "ready"];

function stageState(
  stage: string,
  status: ImportOut["status"],
): "done" | "active" | "waiting" {
  if (status === "applied") return "done";
  const current = ORDER.indexOf(status === "failed" ? "queued" : status);
  const index = ORDER.indexOf(stage);
  if (
    stage === "queued" ||
    index < current ||
    (status === "ready" && stage === "ready")
  )
    return "done";
  return index === current ? "active" : "waiting";
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
  if (!item) {
    return (
      <Shell>
        <div className="grid min-h-[40vh] place-items-center">
          <Spinner className="size-7 text-ink-3" />
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
              ? "Here's what we found"
              : failed
                ? "We couldn't read that CV"
                : "Reading your CV"}
          </h1>
          <p className="mt-3 text-ink-2 [overflow-wrap:anywhere]">
            {item.filename}
          </p>

          {failed ? (
            <Problem message={item.error ?? "Something went wrong."} />
          ) : (
            <ol className="mt-8 flex flex-col">
              {STAGES.map((stage, index) => {
                const state = stageState(stage.key, item.status);
                return (
                  <li
                    key={stage.key}
                    className="relative flex gap-4 pb-6 last:pb-0"
                  >
                    {index < STAGES.length - 1 && (
                      <span
                        aria-hidden
                        className={cn(
                          "absolute left-[0.9375rem] top-9 h-[calc(100%-2.25rem)] w-px",
                          state === "done"
                            ? "bg-ink"
                            : "bg-[linear-gradient(var(--line-strong)_55%,transparent_0)] bg-[length:1px_8px]",
                        )}
                      />
                    )}
                    <span
                      className={cn(
                        "relative grid size-8 shrink-0 place-items-center rounded-full border",
                        state === "done" && "border-ink bg-ink text-canvas",
                        state === "active" &&
                          "border-tape bg-tape text-tape-ink",
                        state === "waiting" &&
                          "border-line-strong bg-surface text-ink-3",
                      )}
                    >
                      {state === "done" ? (
                        <Check className="size-4" aria-hidden />
                      ) : state === "active" ? (
                        <Spinner className="size-4" label={stage.label} />
                      ) : (
                        <span className="size-1.5 rounded-full bg-current" />
                      )}
                    </span>
                    <div className="pt-0.5">
                      <p
                        className={cn(
                          "font-semibold",
                          state === "waiting" && "text-ink-3",
                        )}
                      >
                        {stage.label}
                      </p>
                      <p className="text-[0.9375rem] text-ink-2">
                        {stage.detail}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {item.used_vision && !failed && (
            <p className="mt-6 flex gap-2.5 rounded-control bg-chalk-soft px-4 py-3 text-[0.9375rem] text-ink">
              <ScanText
                className="mt-0.5 size-4 shrink-0 text-chalk"
                aria-hidden
              />
              Your file is a scan, so Tailr read it like a person would. Check
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
            <StitchingSheet
              active={!failed}
              understanding={item.status === "understanding"}
            />
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

/** A blank page whose lines stitch themselves in while the CV is read. */
function StitchingSheet({
  active,
  understanding,
}: {
  active: boolean;
  understanding: boolean;
}) {
  const lines = [
    44, 28, 0, 92, 86, 74, 0, 36, 90, 82, 88, 64, 0, 30, 78, 70, 84,
  ];
  return (
    <div
      aria-hidden
      className="relative mx-auto aspect-[210/297] w-full max-w-[30rem] overflow-hidden rounded-doc bg-white p-[9%] shadow-sheet"
    >
      <div className="flex flex-col gap-3.5">
        {lines.map((width, index) =>
          width === 0 ? (
            <div key={index} className="h-3" />
          ) : (
            <div
              key={index}
              className="relative h-2.5 overflow-hidden rounded-full bg-[#eef1f6]"
            >
              <motion.div
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full",
                  index < 2 ? "bg-[#14213d]" : "bg-[#9aa6bd]",
                )}
                initial={{ width: 0 }}
                animate={
                  active
                    ? {
                        width: understanding
                          ? `${width}%`
                          : [`0%`, `${width}%`, `${width}%`],
                      }
                    : { width: 0 }
                }
                transition={
                  understanding
                    ? { duration: 0.6, delay: index * 0.08, ease: "easeOut" }
                    : {
                        duration: 2.4,
                        delay: index * 0.12,
                        repeat: Infinity,
                        repeatDelay: 0.6,
                        times: [0, 0.6, 1],
                      }
                }
              />
            </div>
          ),
        )}
      </div>
      {active && !understanding && (
        <motion.div
          className="absolute inset-x-0 h-6 bg-tape/80 shadow-[0_2px_12px_rgb(245_197_24/0.5)]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgb(29 26 14 / 0.55) 0 1px, transparent 1px 12px)",
          }}
          initial={{ top: "-8%" }}
          animate={{ top: ["-8%", "104%"] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}
