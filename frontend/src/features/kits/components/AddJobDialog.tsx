import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/choice";
import { Labelled, TextArea } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Field";
import { isApiError } from "@/lib/api/client";
import { usePasteJob } from "../api";

type Mode = "link" | "text";

const MIN_TEXT = 200;
/** Errors that mean "we can't read that link": offer the text form instead. */
const SWITCH_TO_TEXT = new Set([
  "page_unreadable",
  "url_not_allowed",
  "too_short",
  "missing_title",
]);

/** Bring in a job Tailr didn't find: paste its link, or its title, company and description. */
export function AddJobDialog() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("link");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [text, setText] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const paste = usePasteJob();
  const navigate = useNavigate();

  const linkOk = /^https?:\/\/\S+\.\S+/i.test(url.trim());
  const textOk =
    title.trim() && company.trim() && text.trim().length >= MIN_TEXT;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setProblem(null);
    const body =
      mode === "link"
        ? { url: url.trim() }
        : {
            url: url.trim() || undefined,
            title: title.trim(),
            company: company.trim(),
            text: text.trim(),
          };
    paste.mutate(body, {
      onSuccess: (match) => {
        setOpen(false);
        navigate(`/jobs/${match.id}`);
      },
      onError: (error) => {
        setProblem(error.message);
        if (
          mode === "link" &&
          isApiError(error) &&
          SWITCH_TO_TEXT.has(error.code)
        )
          setMode("text");
      },
    });
  };

  return (
    <>
      <Button
        variant="secondary"
        icon={<Plus className="size-4" />}
        onClick={() => setOpen(true)}
      >
        Add a job by link
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => !paste.isPending && setOpen(next)}
        title="Add a job"
        description="Found a job somewhere else? Paste it here. Tailr shows how well you match and can prepare your application."
      >
        <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
          <Segmented
            label="How to add it"
            options={[
              { value: "link", label: "Paste a link" },
              { value: "text", label: "Paste the ad" },
            ]}
            value={mode}
            onChange={(next) => {
              setMode(next);
              setProblem(null);
            }}
          />

          {mode === "link" ? (
            <Field
              label="Link to the job"
              type="url"
              inputMode="url"
              placeholder="https://www.linkedin.com/jobs/view/…"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              hint="LinkedIn and JobStreet links work best. For other sites, Tailr reads the page if it can."
              autoFocus
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Job title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  autoFocus
                />
                <Field
                  label="Company"
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                />
              </div>
              <Labelled
                label="Job description"
                htmlFor="paste-text"
                hint={
                  text.trim().length < MIN_TEXT
                    ? `Paste the whole ad: ${MIN_TEXT - text.trim().length} more characters at least.`
                    : "Looks complete."
                }
              >
                <TextArea
                  id="paste-text"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  className="max-h-[40vh] min-h-32 overflow-y-auto"
                />
              </Labelled>
            </>
          )}

          {problem && (
            <p
              role="alert"
              className="rounded-control bg-pin-soft px-3.5 py-2.5 text-[0.875rem] text-ink"
            >
              {problem}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3">
            {paste.isPending && (
              <span className="text-[0.875rem] text-ink-2">
                Reading the job and measuring your fit
              </span>
            )}
            <Button
              type="submit"
              loading={paste.isPending}
              disabled={mode === "link" ? !linkOk : !textOk}
            >
              Add the job
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
