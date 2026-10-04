import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/controls";
import { Field } from "@/components/ui/Field";
import {
  useUpdateUser,
  type AdminUserDetail,
  type AdminUserUpdate,
} from "../api";
import { compact, exact } from "../format";

const MAX_BUDGET = 100_000_000;

function parseBudget(text: string): number | null {
  if (!/^\d+$/.test(text.trim())) return null;
  const value = Number(text.trim());
  return value <= MAX_BUDGET ? value : null;
}

/** The switches: account on or off, AI on or off, a daily allowance, and admin rights. */
export function UserControls({
  user,
  self,
}: {
  user: AdminUserDetail;
  self: boolean;
}) {
  const update = useUpdateUser();
  const [confirmOff, setConfirmOff] = useState(false);
  const [budget, setBudget] = useState(user.ai_daily_budget?.toString() ?? "");
  // When the saved allowance changes (here or elsewhere), show it.
  const [shown, setShown] = useState(user.ai_daily_budget);
  if (shown !== user.ai_daily_budget) {
    setShown(user.ai_daily_budget);
    setBudget(user.ai_daily_budget?.toString() ?? "");
  }

  const save = (patch: AdminUserUpdate, done: string) =>
    update.mutate(
      { id: user.id, ...patch },
      {
        onSuccess: () => toast.success(done),
        onError: (error) => toast.error(error.message),
      },
    );

  const parsed = parseBudget(budget);
  const budgetError =
    budget.trim() && parsed === null
      ? `Use a whole number of tokens, up to ${compact(MAX_BUDGET)}.`
      : undefined;
  const saveBudget = (event: FormEvent) => {
    event.preventDefault();
    if (parsed === null || parsed === user.ai_daily_budget) return;
    save(
      { ai_daily_budget: parsed },
      parsed === 0
        ? "Daily AI allowance removed: no limit."
        : `Daily AI allowance set to ${compact(parsed)} tokens.`,
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {self ? (
        <p className="rounded-control bg-surface-2 px-4 py-3 text-[0.9375rem] text-ink-2">
          This is you. You can't switch off, demote or turn off AI for your own
          account.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <Switch
              label="Account active"
              checked={user.is_active}
              onCheckedChange={(on) =>
                on
                  ? save({ is_active: true }, "Account turned back on.")
                  : setConfirmOff(true)
              }
            />
            {confirmOff && user.is_active && (
              <div
                role="alert"
                className="mt-3 rounded-control border border-pin/30 bg-pin-soft p-4"
              >
                <p className="text-[0.9375rem]">
                  They'll be signed out everywhere and can't sign in until you
                  turn this back on.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="danger"
                    loading={update.isPending}
                    onClick={() => {
                      setConfirmOff(false);
                      save(
                        { is_active: false },
                        "Account disabled and signed out.",
                      );
                    }}
                  >
                    Disable account
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmOff(false)}
                  >
                    Keep it on
                  </Button>
                </div>
              </div>
            )}
          </div>
          <div>
            <Switch
              label="AI features"
              checked={user.ai_enabled}
              onCheckedChange={(on) =>
                save(
                  { ai_enabled: on },
                  on ? "AI turned back on." : "AI turned off for this account.",
                )
              }
            />
            <p className="mt-1 pl-[3.125rem] text-[0.8125rem] text-ink-3">
              Off: tailoring, fit reviews, drafts and CV edits stop for them.
              Everything else keeps working.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={saveBudget} className="flex flex-col gap-2">
        <Field
          label="Daily AI allowance (tokens)"
          inputMode="numeric"
          value={budget}
          placeholder={`Default: ${exact(user.default_budget)}`}
          onChange={(event) =>
            setBudget(event.target.value.replace(/[^\d]/g, ""))
          }
          error={budgetError}
          hint={
            parsed !== null
              ? parsed === 0
                ? "0 means no limit."
                : `About ${compact(parsed)} tokens a day.`
              : `Leave it to use the default, ${compact(user.default_budget)} a day.`
          }
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            size="sm"
            disabled={parsed === null || parsed === user.ai_daily_budget}
            loading={update.isPending}
          >
            Save allowance
          </Button>
          {user.ai_daily_budget !== null && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() =>
                save(
                  { ai_daily_budget: null },
                  `Back to the default allowance, ${compact(user.default_budget)}.`,
                )
              }
            >
              Use the default ({compact(user.default_budget)})
            </Button>
          )}
        </div>
      </form>

      {!self && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <p className="text-[0.9375rem] text-ink-2">
            {user.role === "admin"
              ? "An administrator: can open this panel and change accounts."
              : user.is_demo
                ? "The shared demo account. Its password is public, so it can't be an administrator."
                : "A regular account."}
          </p>
          {(user.role === "admin" || !user.is_demo) && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                user.role === "admin"
                  ? save({ role: "user" }, "Admin rights removed.")
                  : save({ role: "admin" }, "Made an administrator.")
              }
            >
              {user.role === "admin" ? "Remove admin" : "Make admin"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
