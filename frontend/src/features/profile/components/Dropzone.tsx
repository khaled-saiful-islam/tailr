import { FileUp } from "lucide-react";
import { motion } from "motion/react";
import { useId, useRef, useState, type DragEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";

const ACCEPT = ".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp,application/pdf,image/*";
export const MAX_MB = 10;

interface DropzoneProps {
  busy: boolean;
  onFile: (file: File) => void;
  onReject: (message: string) => void;
}

/** A cutting mat for your CV: drop a file on it, or choose one. */
export function Dropzone({ busy, onFile, onReject }: DropzoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const hintId = useId();

  const take = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      onReject(`That file is larger than ${MAX_MB} MB. Try a smaller PDF or a photo.`);
      return;
    }
    onFile(file);
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setOver(false);
    if (!busy) take(event.dataTransfer.files);
  };

  return (
    <motion.div
      onDragOver={(event) => {
        event.preventDefault();
        if (!busy) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      animate={{ y: over ? -4 : 0, scale: over ? 1.01 : 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={cn(
        "pattern-paper relative flex min-h-[19rem] flex-col items-center justify-center rounded-sheet border-2 border-dashed px-6 py-12 text-center transition-colors",
        over ? "border-tape bg-[color-mix(in_oklab,var(--tape)_8%,var(--canvas))]" : "border-line-strong",
      )}
    >
      <motion.div
        animate={{ rotate: over ? -6 : 0, y: over ? -6 : 0 }}
        className={cn(
          "grid size-16 place-items-center rounded-[18px] shadow-sheet",
          over ? "bg-tape text-tape-ink" : "bg-surface text-ink",
        )}
      >
        {busy ? <Spinner className="size-7" label="Uploading" /> : <FileUp className="size-7" aria-hidden />}
      </motion.div>
      <p className="type-heading mt-6">{busy ? "Uploading your CV" : over ? "Drop it here" : "Drop your CV here"}</p>
      <p id={hintId} className="mt-2 max-w-[24rem] text-ink-2">
        PDF, Word or a clear photo of your CV, up to {MAX_MB} MB.
      </p>
      <Button
        className="mt-6"
        variant="primary"
        size="lg"
        disabled={busy}
        onClick={() => input.current?.click()}
        aria-describedby={hintId}
      >
        Choose a file
      </Button>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          take(event.target.files);
          event.target.value = "";
        }}
      />
    </motion.div>
  );
}
