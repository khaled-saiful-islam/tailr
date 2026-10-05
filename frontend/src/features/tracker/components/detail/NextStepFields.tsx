import { useState } from "react";
import { Field } from "@/components/ui/Field";
import type { ApplicationDetail, ApplicationUpdate } from "../../api";
import { fromDateTimeInput, toDateTimeInput } from "../../dates";

/** What's next (an interview, a call) and when. Tailr reminds you the day before. */
export function NextStepFields({
  app,
  save,
  label = "What's next",
  placeholder = "Technical interview",
}: {
  app: ApplicationDetail;
  save: (patch: ApplicationUpdate, delay?: number) => void;
  label?: string;
  placeholder?: string;
}) {
  const [nextStep, setNextStep] = useState(app.next_step ?? "");
  const [nextAt, setNextAt] = useState(toDateTimeInput(app.next_step_at));
  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
      <Field
        label={label}
        placeholder={placeholder}
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
  );
}
