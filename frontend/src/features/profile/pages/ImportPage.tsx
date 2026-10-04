import { ClipboardType, PencilLine } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/controls";
import { usePasteCv, useUploadCv } from "../api";
import { Dropzone } from "../components/Dropzone";

const MIN_TEXT = 80;

export function ImportPage() {
  const navigate = useNavigate();
  const upload = useUploadCv();
  const paste = usePasteCv();
  const [pasting, setPasting] = useState(false);
  const [text, setText] = useState("");

  const open = (id: string) => navigate(`/profile/import/${id}`);

  const onFile = (file: File) =>
    upload.mutate(file, {
      onSuccess: (item) => open(item.id),
      onError: (error) => toast.error(error.message),
    });

  const onPaste = () =>
    paste.mutate(text, {
      onSuccess: (item) => open(item.id),
      onError: (error) => toast.error(error.message),
    });

  return (
    <div className="mx-auto w-full max-w-[60rem] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="type-title">Upload your CV</h1>
        <p className="mt-3 max-w-[38rem] text-[1.0625rem] text-ink-2">
          Tailr reads it and fills in your profile for you. You check everything
          before it's saved.
        </p>
      </motion.header>

      <div className="mt-10">
        <Dropzone
          busy={upload.isPending}
          onFile={onFile}
          onReject={(message) => toast.error(message)}
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={() => setPasting((value) => !value)}
          aria-expanded={pasting}
          className="flex items-start gap-4 rounded-panel border border-line bg-surface p-5 text-left transition-colors hover:border-line-strong"
        >
          <ClipboardType
            className="mt-0.5 size-5 shrink-0 text-ink-2"
            aria-hidden
          />
          <span>
            <span className="block font-semibold">Paste your CV as text</span>
            <span className="mt-1 block text-[0.9375rem] text-ink-2">
              Useful when your file won't open, or for a quick start.
            </span>
          </span>
        </button>
        <Link
          to="/profile"
          className="flex items-start gap-4 rounded-panel border border-line bg-surface p-5 transition-colors hover:border-line-strong"
        >
          <PencilLine
            className="mt-0.5 size-5 shrink-0 text-ink-2"
            aria-hidden
          />
          <span>
            <span className="block font-semibold">Start from scratch</span>
            <span className="mt-1 block text-[0.9375rem] text-ink-2">
              Fill in your profile section by section.
            </span>
          </span>
        </Link>
      </div>

      <AnimatePresence initial={false}>
        {pasting && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-4 rounded-panel border border-line bg-surface p-5">
              <label htmlFor="cv-text" className="type-label">
                Your CV
              </label>
              <TextArea
                id="cv-text"
                className="mt-2 min-h-48"
                placeholder="Paste everything: your roles, achievements, education and skills."
                value={text}
                onChange={(event) => setText(event.target.value)}
                autoFocus
              />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[0.8125rem] text-ink-3">
                  {text.trim().length < MIN_TEXT
                    ? `Paste at least ${MIN_TEXT} characters.`
                    : `${text.trim().length.toLocaleString()} characters`}
                </p>
                <Button
                  disabled={text.trim().length < MIN_TEXT}
                  loading={paste.isPending}
                  onClick={onPaste}
                >
                  Read this text
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-8 text-[0.9375rem] text-ink-2">
        <span className="font-semibold text-ink">From LinkedIn?</span> Open your
        profile, choose More, then Save to PDF, and upload that file here.
      </p>
    </div>
  );
}
