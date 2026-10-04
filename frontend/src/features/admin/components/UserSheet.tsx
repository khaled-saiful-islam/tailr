import { X } from "lucide-react";
import { Dialog as RadixDialog } from "radix-ui";
import type { ReactNode } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { initials, relativeTime } from "@/lib/format";
import { useAdminUser, type AdminUserDetail } from "../api";
import { exact } from "../format";
import { Purposes } from "./Purposes";
import { UsageChart } from "./UsageChart";
import { UserControls } from "./UserControls";
import { Allowance, Badges } from "./UsersPanel";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line px-5 py-5 sm:px-6">
      <h3 className="type-label mb-3 text-ink-2">{title}</h3>
      {children}
    </section>
  );
}

function joined(iso: string): string {
  return new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function Body({ user, self }: { user: AdminUserDetail; self: boolean }) {
  const budget = user.ai_daily_budget ?? user.default_budget;
  const counts = [
    { label: "Applications", value: user.applications },
    { label: "Prepared applications", value: user.kits },
    { label: "Matched jobs", value: user.matches },
    { label: "Signed-in devices", value: user.signed_in_devices },
  ];
  return (
    <>
      <div className="px-5 pb-5 sm:px-6">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-3 text-[0.875rem] font-bold"
          >
            {initials(user.name)}
          </span>
          <div className="min-w-0">
            <RadixDialog.Title className="type-heading leading-snug">
              {user.name}
            </RadixDialog.Title>
            <RadixDialog.Description className="mt-0.5 text-ink-2 [overflow-wrap:anywhere]">
              {user.username ? `${user.username}, ` : ""}
              {user.email}
            </RadixDialog.Description>
            <div className="mt-2">
              <Badges user={user} />
            </div>
          </div>
        </div>
        <p className="mt-3 text-[0.875rem] text-ink-3">
          Joined {joined(user.created_at)}.{" "}
          {user.last_login_at
            ? `Last signed in ${relativeTime(user.last_login_at)}.`
            : "Hasn't signed in yet."}
        </p>
      </div>

      <Section title="Controls">
        <UserControls user={user} self={self} />
      </Section>

      <Section title="AI use">
        <p className="text-[0.875rem] text-ink-3">Last 24 hours</p>
        <div className="mt-1">
          <Allowance used={user.tokens_24h} budget={budget} />
        </div>
        <p className="mt-3 text-[0.875rem] text-ink-2">
          In 30 days:{" "}
          <span className="type-figure text-ink">{exact(user.tokens_30d)}</span>{" "}
          tokens over {exact(user.calls_30d)} calls
          {user.errors_30d > 0 ? `, ${exact(user.errors_30d)} failed` : ""}.
        </p>
        <UsageChart
          className="mt-5"
          days={user.days}
          caption="Tokens a day, last 14 days"
        />
        <div className="mt-6">
          <Purposes items={user.purposes_30d} />
        </div>
      </Section>

      <Section title="Their Tailr">
        <dl className="grid grid-cols-2 gap-4">
          {counts.map((count) => (
            <div key={count.label}>
              <dt className="text-[0.8125rem] text-ink-3">{count.label}</dt>
              <dd className="type-figure text-[1.375rem]">{count.value}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </>
  );
}

/** One person, opened from the list: a sheet from the right (full screen on phones). */
export function UserSheet({
  id,
  selfId,
  onClose,
}: {
  id: string | null;
  selfId: string | undefined;
  onClose: () => void;
}) {
  const query = useAdminUser(id);
  return (
    <RadixDialog.Root
      open={Boolean(id)}
      onOpenChange={(open) => !open && onClose()}
    >
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-overlay backdrop-blur-[2px] data-[state=open]:animate-[tailr-fade_160ms_ease-out]" />
        <RadixDialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[34rem] flex-col border-l border-line bg-surface shadow-sheet data-[state=open]:animate-[tailr-sheet-in_240ms_cubic-bezier(0.22,1,0.36,1)]"
        >
          <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4 sm:px-6">
            <span className="text-[0.875rem] text-ink-3">Account</span>
            <RadixDialog.Close
              aria-label="Close"
              className="-mr-2 grid size-10 place-items-center rounded-[9px] text-ink-3 hover:bg-surface-2 hover:text-ink"
            >
              <X className="size-5" aria-hidden />
            </RadixDialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
            {query.data ? (
              <Body user={query.data} self={query.data.id === selfId} />
            ) : query.isError ? (
              <div className="px-6 py-10">
                <RadixDialog.Title className="type-heading">
                  We couldn't open that account
                </RadixDialog.Title>
                <p className="mt-2 text-ink-2">{query.error.message}</p>
              </div>
            ) : (
              <div className="grid place-items-center py-24">
                <RadixDialog.Title className="sr-only">
                  Loading
                </RadixDialog.Title>
                <Spinner className="size-6 text-ink-3" />
              </div>
            )}
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
