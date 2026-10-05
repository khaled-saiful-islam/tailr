import { useState } from "react";
import { Labelled, TextArea } from "@/components/ui/controls";
import { Field } from "@/components/ui/Field";
import type { ApplicationDetail, ApplicationUpdate } from "../api";
import { fromDateInput, toDateInput } from "../dates";
import { step } from "../stages";
import { NextStepFields } from "./detail/NextStepFields";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  app: ApplicationDetail;
  save: (patch: ApplicationUpdate, delay?: number) => void;
  /** Ask about a next step here (an interview shows it in its own card instead). */
  withNextStep?: boolean;
}

/** Who you're talking to, your notes, and the dates that matter. Saved as you type. */
export function DetailsForm({ app, save, withNextStep = false }: Props) {
  const [appliedOn, setAppliedOn] = useState(toDateInput(app.applied_at));
  const [name, setName] = useState(app.contact_name ?? "");
  const [email, setEmail] = useState(app.contact_email ?? "");
  const [notes, setNotes] = useState(app.notes ?? "");
  const emailOk = !email.trim() || EMAIL.test(email.trim());
  // Moving a card to Applied sets the date on the server; show it here too.
  const [shownApplied, setShownApplied] = useState(app.applied_at);
  if (app.applied_at !== shownApplied) {
    setShownApplied(app.applied_at);
    setAppliedOn(toDateInput(app.applied_at));
  }
  const sent = step(app.stage) >= step("applied") || app.stage === "rejected";

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Who you're talking to (optional)"
          placeholder="Wei Ling, Talent team"
          maxLength={120}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            save({ contact_name: event.target.value });
          }}
        />
        <Field
          label="Their email (optional)"
          type="email"
          inputMode="email"
          value={email}
          error={emailOk ? undefined : "Check the address."}
          hint={emailOk ? "Used when you email a follow-up." : undefined}
          onChange={(event) => {
            const value = event.target.value;
            setEmail(value);
            if (!value.trim() || EMAIL.test(value.trim()))
              save({ contact_email: value.trim() || null });
          }}
        />
      </div>
      <Labelled label="Notes" htmlFor={`notes-${app.id}`}>
        <TextArea
          id={`notes-${app.id}`}
          maxLength={5000}
          placeholder="Salary they mentioned, who referred you, questions to ask."
          value={notes}
          onChange={(event) => {
            setNotes(event.target.value);
            save({ notes: event.target.value }, 900);
          }}
          className="min-h-28"
        />
      </Labelled>
      {withNextStep && (
        <NextStepFields
          app={app}
          save={save}
          label="Anything coming up? (optional)"
          placeholder="Phone call with the recruiter"
        />
      )}
      {sent && (
        <div className="max-w-[16rem]">
          <Field
            label="Applied on"
            type="date"
            value={appliedOn}
            max={toDateInput(new Date().toISOString())}
            onChange={(event) => {
              setAppliedOn(event.target.value);
              const iso = fromDateInput(event.target.value);
              if (iso) save({ applied_at: iso }, 300);
            }}
          />
        </div>
      )}
    </div>
  );
}
