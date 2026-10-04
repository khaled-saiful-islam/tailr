import { useState } from "react";
import { Labelled, TextArea } from "@/components/ui/controls";
import { Field } from "@/components/ui/Field";
import type { ApplicationDetail, ApplicationUpdate } from "../api";
import {
  fromDateInput,
  fromDateTimeInput,
  toDateInput,
  toDateTimeInput,
} from "../dates";
import { step } from "../stages";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  app: ApplicationDetail;
  save: (patch: ApplicationUpdate, delay?: number) => void;
}

/** Dates, the next step, who you're talking to, and your notes. Saved as you type. */
export function DetailsForm({ app, save }: Props) {
  const [appliedOn, setAppliedOn] = useState(toDateInput(app.applied_at));
  const [nextStep, setNextStep] = useState(app.next_step ?? "");
  const [nextAt, setNextAt] = useState(toDateTimeInput(app.next_step_at));
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
      {sent && (
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
      )}
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_13rem]">
        <Field
          label="Next step"
          placeholder="Technical interview"
          maxLength={120}
          value={nextStep}
          onChange={(event) => {
            setNextStep(event.target.value);
            save({ next_step: event.target.value });
          }}
        />
        <Field
          label="When"
          type="datetime-local"
          value={nextAt}
          onChange={(event) => {
            setNextAt(event.target.value);
            save({ next_step_at: fromDateTimeInput(event.target.value) }, 400);
          }}
          hint="Tailr reminds you the day before."
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Contact (optional)"
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
    </div>
  );
}
