/**
 * The portfolio's contact form. Messages reach the owner by email and in Tailr; their
 * address stays private. A hidden field and a signed time stamp keep bots out.
 * Templates pass class names; the behaviour is the same in every template.
 */
import { Check } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { PublicPage } from "../types";

export interface FormStyles {
  form?: string;
  label: string;
  input: string;
  textarea?: string;
  chip: string;
  chipOn: string;
  submit: string;
  note?: string;
  success?: string;
}

const REASONS = [
  { value: "job", label: "A job opportunity" },
  { value: "freelance", label: "Freelance work" },
  { value: "hello", label: "Just saying hi" },
] as const;

type Reason = (typeof REASONS)[number]["value"];
type State = "idle" | "sending" | "sent" | "error";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function ContactForm({
  page,
  preview,
  styles,
}: {
  page: PublicPage;
  preview?: boolean;
  styles: FormStyles;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState<Reason>("job");
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<State>("idle");
  const [problem, setProblem] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const firstName = page.name.split(" ")[0] ?? page.name;

  const errors = {
    name: !name.trim() ? "Add your name." : null,
    email: !EMAIL.test(email.trim())
      ? "Add an email address they can reply to."
      : null,
    message:
      message.trim().length < 20
        ? `Write a little more (${20 - message.trim().length} more characters).`
        : null,
  };
  const valid = !errors.name && !errors.email && !errors.message;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (!valid) return;
    if (preview) {
      setState("sent");
      return;
    }
    setState("sending");
    setProblem(null);
    try {
      const response = await fetch(
        `/api/v1/public/profiles/${encodeURIComponent(page.slug)}/messages`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            reason,
            company: company.trim() || null,
            message: message.trim(),
            website,
            token: page.form_token ?? "",
          }),
        },
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(
          body.error?.message ?? "Your message wasn't sent. Try again.",
        );
      }
      setState("sent");
    } catch (error) {
      setState("error");
      setProblem(
        error instanceof Error
          ? error.message
          : "Your message wasn't sent. Try again.",
      );
    }
  };

  if (state === "sent") {
    return (
      <div role="status" aria-live="polite" className={styles.success}>
        <Check className="size-6" aria-hidden />
        <p className="mt-2 font-semibold">
          Thanks, your message is on its way to {firstName}.
        </p>
        <p className="mt-1 opacity-80">
          They'll reply to the email address you gave.
        </p>
      </div>
    );
  }

  const field = (
    id: string,
    label: string,
    error: string | null,
    input: React.ReactNode,
  ) => (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className={styles.label}>{label}</span>
      {input}
      {touched && error && (
        <span
          id={`${id}-error`}
          className="text-[0.8125rem] font-medium text-pg-accent"
        >
          {error}
        </span>
      )}
    </label>
  );

  return (
    <form
      onSubmit={(event) => void submit(event)}
      noValidate
      className={styles.form ?? "flex flex-col gap-5"}
    >
      <div
        role="radiogroup"
        aria-label="What it's about"
        className="flex flex-wrap gap-2"
      >
        {REASONS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="radio"
            aria-checked={reason === item.value}
            onClick={() => setReason(item.value)}
            className={reason === item.value ? styles.chipOn : styles.chip}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="grid gap-5 @2xl:grid-cols-2">
        {field(
          "contact-name",
          "Your name",
          errors.name,
          <input
            id="contact-name"
            className={styles.input}
            autoComplete="name"
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={touched && Boolean(errors.name)}
          />,
        )}
        {field(
          "contact-email",
          "Your email",
          errors.email,
          <input
            id="contact-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            className={styles.input}
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={touched && Boolean(errors.email)}
          />,
        )}
      </div>
      {field(
        "contact-company",
        "Company (optional)",
        null,
        <input
          id="contact-company"
          className={styles.input}
          autoComplete="organization"
          maxLength={120}
          value={company}
          onChange={(event) => setCompany(event.target.value)}
        />,
      )}
      {field(
        "contact-message",
        "Message",
        errors.message,
        <textarea
          id="contact-message"
          rows={5}
          maxLength={2000}
          className={styles.textarea ?? styles.input}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          aria-invalid={touched && Boolean(errors.message)}
        />,
      )}
      {/* People never see this field; bots fill it in. */}
      <div
        aria-hidden="true"
        className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
      >
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>
      {problem && (
        <p role="alert" className="text-[0.9375rem] font-medium text-pg-accent">
          {problem}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={styles.note ?? "text-[0.8125rem] text-pg-ink-3"}>
          Sent to {firstName} through Tailr. Your email is shared only with
          them.
        </p>
        <button
          type="submit"
          disabled={state === "sending"}
          className={styles.submit}
          aria-busy={state === "sending" || undefined}
        >
          {state === "sending" ? "Sending" : "Send message"}
        </button>
      </div>
    </form>
  );
}
