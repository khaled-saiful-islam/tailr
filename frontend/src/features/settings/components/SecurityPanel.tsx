import { Laptop, LogOut } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/controls";
import { PasswordField } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { relativeTime } from "@/lib/format";
import { useChangePassword, useDevices, useSignOutOthers } from "../api";

const MIN_LENGTH = 8;

function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [tried, setTried] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const change = useChangePassword();

  const errors = {
    current: current ? null : "Enter your current password.",
    next:
      next.length < MIN_LENGTH
        ? `Use at least ${MIN_LENGTH} characters.`
        : next === current
          ? "Choose a password you haven't used here."
          : null,
    confirm: confirm === next ? null : "This doesn't match the new password.",
  };
  const valid = !errors.current && !errors.next && !errors.confirm;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTried(true);
    setProblem(null);
    if (!valid) return;
    change.mutate(
      { current_password: current, new_password: next },
      {
        onSuccess: () => {
          toast.success("Password changed. Your other devices are signed out.");
          setCurrent("");
          setNext("");
          setConfirm("");
          setTried(false);
        },
        onError: (error) => setProblem(error.message),
      },
    );
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <h3 className="type-heading text-[1.0625rem]">Change your password</h3>
      <PasswordField
        label="Current password"
        autoComplete="current-password"
        value={current}
        error={tried ? (errors.current ?? undefined) : undefined}
        onChange={(event) => setCurrent(event.target.value)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <PasswordField
          label="New password"
          autoComplete="new-password"
          value={next}
          hint={`At least ${MIN_LENGTH} characters.`}
          error={tried ? (errors.next ?? undefined) : undefined}
          onChange={(event) => setNext(event.target.value)}
        />
        <PasswordField
          label="New password again"
          autoComplete="new-password"
          value={confirm}
          error={tried ? (errors.confirm ?? undefined) : undefined}
          onChange={(event) => setConfirm(event.target.value)}
        />
      </div>
      {problem && (
        <p role="alert" className="text-[0.875rem] font-medium text-pin">
          {problem}
        </p>
      )}
      <Button type="submit" className="self-start" loading={change.isPending}>
        Change password
      </Button>
    </form>
  );
}

const SHOWN = 5;

function Devices() {
  const devices = useDevices();
  const signOut = useSignOutOthers();
  const [all, setAll] = useState(false);
  const list = [...(devices.data ?? [])].sort(
    (a, b) => Number(b.current) - Number(a.current),
  );
  const others = list.filter((device) => !device.current);
  const shown = all ? list : list.slice(0, SHOWN);

  return (
    <div>
      <h3 className="type-heading text-[1.0625rem]">Where you're signed in</h3>
      {devices.isPending ? (
        <Spinner className="mt-4 size-5 text-ink-3" />
      ) : devices.isError ? (
        <p className="mt-3 text-ink-2">{devices.error.message}</p>
      ) : (
        <ul className="mt-3 divide-y divide-line rounded-control border border-line">
          {shown.map((device) => (
            <li key={device.id} className="flex items-start gap-3 px-4 py-3">
              <Laptop
                className="mt-0.5 size-5 shrink-0 text-ink-3"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
                  {device.device}
                  {device.current && (
                    <span className="rounded-full bg-chalk-soft px-2 py-0.5 text-[0.75rem] font-semibold text-chalk">
                      This device
                    </span>
                  )}
                </p>
                <p className="text-[0.875rem] text-ink-3">
                  {[
                    device.ip_address,
                    `active ${relativeTime(device.last_used_at)}`,
                    `signed in ${relativeTime(device.created_at)}`,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {list.length > SHOWN && (
        <div>
          <button
            type="button"
            onClick={() => setAll((value) => !value)}
            aria-expanded={all}
            className="mt-2 text-[0.875rem] font-semibold text-chalk hover:underline"
          >
            {all ? "Show fewer" : `Show all ${list.length}`}
          </button>
        </div>
      )}
      <Button
        variant="secondary"
        className="mt-4 flex w-fit"
        icon={<LogOut className="size-4" />}
        disabled={others.length === 0}
        loading={signOut.isPending}
        onClick={() =>
          signOut.mutate(undefined, {
            onSuccess: ({ signed_out }) =>
              toast.success(
                signed_out === 1
                  ? "Signed out of 1 other device."
                  : `Signed out of ${signed_out} other devices.`,
              ),
            onError: (error) => toast.error(error.message),
          })
        }
      >
        Sign out everywhere else
      </Button>
      {others.length === 0 && devices.data && (
        <p className="mt-2 text-[0.8125rem] text-ink-3">
          This is the only device signed in.
        </p>
      )}
    </div>
  );
}

/** Your password and the devices signed in to your account. */
export function SecurityPanel() {
  return (
    <Panel
      id="security"
      title="Security"
      description="Changing your password signs out every other device."
    >
      <div className="flex flex-col gap-10">
        <PasswordForm />
        <Devices />
      </div>
    </Panel>
  );
}
