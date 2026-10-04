import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/choice";
import { Panel, Switch } from "@/components/ui/controls";
import { Field } from "@/components/ui/Field";
import { useTheme, type ThemeChoice } from "@/app/theme-context";
import { useUpdateMe, type User } from "@/features/auth/api";
import { ZonePicker } from "./ZonePicker";

const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: "system", label: "Match my device" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/** Your name, as Tailr greets you. */
export function YouPanel({ user }: { user: User }) {
  const [name, setName] = useState(user.name);
  const update = useUpdateMe();
  const trimmed = name.trim();
  const changed = trimmed !== user.name;

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!trimmed || !changed) return;
    update.mutate(
      { name: trimmed },
      {
        onSuccess: () => toast.success("Name saved."),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <Panel
      id="you"
      title="You"
      description="How Tailr greets you. Your CV and website use the name in your profile."
    >
      <form onSubmit={save} className="flex flex-wrap items-end gap-3">
        <Field
          className="min-w-[min(100%,18rem)] flex-1"
          label="Your name"
          autoComplete="name"
          maxLength={120}
          value={name}
          error={trimmed ? undefined : "Add your name."}
          onChange={(event) => setName(event.target.value)}
        />
        <Button
          type="submit"
          disabled={!changed || !trimmed}
          loading={update.isPending}
        >
          Save
        </Button>
      </form>
      <p className="mt-4 text-[0.875rem] text-ink-3">
        You sign in with {user.username ? `${user.username} or ` : ""}
        {user.email}.
      </p>
    </Panel>
  );
}

/** Time zone, theme and email: saved the moment you change them. */
export function PreferencesPanel({ user }: { user: User }) {
  const update = useUpdateMe();
  const { choice, setChoice } = useTheme();

  const save = (
    body: Parameters<typeof update.mutate>[0],
    done: string,
    undo?: () => void,
  ) =>
    update.mutate(body, {
      onSuccess: () => toast.success(done),
      onError: (error) => {
        undo?.();
        toast.error(error.message);
      },
    });

  return (
    <Panel
      id="preferences"
      title="Preferences"
      description="Saved as soon as you change them."
    >
      <div className="flex flex-col gap-7">
        <ZonePicker
          label="Time zone"
          value={user.timezone}
          onChange={(timezone) =>
            timezone !== user.timezone && save({ timezone }, "Time zone saved.")
          }
          hint="Your daily job update runs at your local time, and your days in a row are counted in it."
        />

        <div>
          <p className="type-label">Theme</p>
          <div className="mt-2">
            <Segmented
              label="Theme"
              options={THEMES}
              value={choice}
              onChange={(theme) => {
                const before = choice;
                setChoice(theme);
                save({ theme }, "Theme saved to your account.", () =>
                  setChoice(before),
                );
              }}
            />
          </div>
          <p className="mt-2 text-[0.8125rem] text-ink-3">
            Saved to your account, so it follows you to every device.
          </p>
        </div>

        <div>
          <Switch
            label="Email me my daily job update"
            checked={user.email_digest}
            onCheckedChange={(email_digest) =>
              save(
                { email_digest },
                email_digest
                  ? "You'll get your daily job update by email too."
                  : "No more update emails. New jobs still show on your Jobs page.",
              )
            }
          />
          <p className="mt-1.5 pl-[3.25rem] text-[0.8125rem] text-ink-3">
            The best new jobs and how well they match you, on the days Tailr
            searches. You can also turn this off in Job preferences.
          </p>
        </div>
      </div>
    </Panel>
  );
}
