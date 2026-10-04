/**
 * What a visitor can do on a page: contact, download the CV, share, switch light/dark.
 * Templates style these through `className`; the behaviour is the same everywhere.
 */
import {
  Check,
  Copy,
  Download,
  Link2,
  Mail,
  Moon,
  Share2,
  Sun,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Mode, PublicPage } from "../types";

type Reveal =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "shown"; email: string }
  | { state: "error"; message: string };

async function revealEmail(slug: string): Promise<string> {
  const response = await fetch(
    `/api/v1/public/profiles/${encodeURIComponent(slug)}/contact`,
    { method: "POST", headers: { Accept: "application/json" } },
  );
  if (!response.ok) {
    throw new Error(
      response.status === 429
        ? "Too many requests. Try again in a while."
        : "Contact details aren't available right now.",
    );
  }
  const body = (await response.json()) as { email: string };
  return body.email;
}

/**
 * "Email me": the address isn't in the page, so scrapers can't harvest it.
 * One click asks for it, then the button becomes the address itself.
 */
export function ContactAction({
  page,
  preview,
  className,
  children = "Email me",
}: {
  page: PublicPage;
  preview?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const [reveal, setReveal] = useState<Reveal>({ state: "idle" });
  const [copied, setCopied] = useState(false);
  if (!page.has_contact) return null;

  if (reveal.state === "shown") {
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        <a href={`mailto:${reveal.email}`} className={className}>
          <Mail className="size-[1.05em] shrink-0" aria-hidden />
          {reveal.email}
        </a>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(reveal.email).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            });
          }}
          className="grid size-9 place-items-center rounded-full text-pg-ink-2 hover:text-pg-ink"
          aria-label={copied ? "Copied" : "Copy email address"}
        >
          {copied ? (
            <Check className="size-4" aria-hidden />
          ) : (
            <Copy className="size-4" aria-hidden />
          )}
        </button>
      </span>
    );
  }

  const onClick = async () => {
    if (preview) {
      setReveal({ state: "shown", email: "your contact email" });
      return;
    }
    setReveal({ state: "loading" });
    try {
      setReveal({ state: "shown", email: await revealEmail(page.slug) });
    } catch (error) {
      setReveal({
        state: "error",
        message: error instanceof Error ? error.message : "Try again.",
      });
    }
  };

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => void onClick()}
        className={className}
        aria-busy={reveal.state === "loading" || undefined}
      >
        <Mail className="size-[1.05em] shrink-0" aria-hidden />
        {children}
      </button>
      {reveal.state === "error" && (
        <span role="alert" className="text-[0.8125rem] text-pg-ink-3">
          {reveal.message}
        </span>
      )}
    </span>
  );
}

export function CvAction({
  page,
  preview,
  className,
  children = "Download CV",
}: {
  page: PublicPage;
  preview?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  if (!page.cv_url) return null;
  return (
    <a
      href={preview ? undefined : page.cv_url}
      download={preview ? undefined : `${page.slug}-CV.pdf`}
      title={preview ? "Works on your published page" : undefined}
      className={className}
      aria-disabled={preview || undefined}
      onClick={preview ? (event) => event.preventDefault() : undefined}
    >
      <Download className="size-[1.05em] shrink-0" aria-hidden />
      {children}
    </a>
  );
}

/** What a share needs: a name, an optional line, and the address. */
export type Shareable = Pick<PublicPage, "name" | "headline" | "url">;

/** Native share sheet on phones; a small menu (copy, WhatsApp, LinkedIn) elsewhere. */
export function ShareAction({
  page,
  className,
  menuClassName = "rounded-xl",
  up = false,
  children = "Share",
}: {
  page: Shareable;
  className?: string;
  menuClassName?: string;
  /** Open the menu above the button (e.g. in a bar at the bottom of the screen). */
  up?: boolean;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  const title = page.headline ? `${page.name}, ${page.headline}` : page.name;

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (
        event instanceof MouseEvent &&
        box.current?.contains(event.target as Node)
      )
        return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const onClick = async () => {
    if (
      typeof navigator.share === "function" &&
      matchMedia("(pointer: coarse)").matches
    ) {
      try {
        await navigator.share({ title, url: page.url });
        return;
      } catch {
        // dismissed or unsupported: fall through to the menu
      }
    }
    setOpen((value) => !value);
  };

  const copy = () => {
    void navigator.clipboard?.writeText(page.url).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    });
  };
  const encoded = encodeURIComponent(page.url);
  const item =
    "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[0.9375rem] text-pg-ink hover:bg-pg-ink/[0.06]";

  return (
    <span ref={box} className="relative inline-flex">
      <button
        type="button"
        onClick={() => void onClick()}
        className={className}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Share2 className="size-[1.05em] shrink-0" aria-hidden />
        {children}
      </button>
      <AnimatePresence>
        {open && (
          <motion.span
            role="menu"
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className={`absolute left-0 z-30 flex w-56 ${up ? "bottom-full mb-2" : "top-full mt-2"} flex-col overflow-hidden border border-pg-line bg-pg-2 py-1 font-pg-body shadow-[0_18px_40px_-16px_rgb(0_0_0/0.35)] ${menuClassName}`}
          >
            <button
              type="button"
              role="menuitem"
              className={item}
              onClick={copy}
            >
              {copied ? (
                <Check className="size-4" aria-hidden />
              ) : (
                <Link2 className="size-4" aria-hidden />
              )}
              {copied ? "Link copied" : "Copy link"}
            </button>
            <a
              role="menuitem"
              className={item}
              href={`https://wa.me/?text=${encodeURIComponent(`${title} ${page.url}`)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Share2 className="size-4" aria-hidden />
              WhatsApp
            </a>
            <a
              role="menuitem"
              className={item}
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Share2 className="size-4" aria-hidden />
              LinkedIn
            </a>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

export function ModeAction({
  mode,
  onToggle,
  className,
}: {
  mode: Mode;
  onToggle: () => void;
  className?: string;
}) {
  const next = mode === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={onToggle}
      className={className}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      {mode === "dark" ? (
        <Sun className="size-[1.1em]" aria-hidden />
      ) : (
        <Moon className="size-[1.1em]" aria-hidden />
      )}
    </button>
  );
}

/** Small print at the foot of every page. */
export function MadeWithTailr({ className }: { className?: string }) {
  return (
    <a
      href="/"
      className={className}
      target="_blank"
      rel="noopener"
      aria-label="Made with Tailr"
    >
      Made with <span className="font-semibold">Tailr</span>
    </a>
  );
}
