import { Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { inputClass } from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import { initials, relativeTime } from "@/lib/format";
import { PAGE_SIZE, useUsers, type AdminUser, type UserStatus } from "../api";
import { compact, exact, share } from "../format";

const FILTERS: { key: UserStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "disabled", label: "Disabled" },
  { key: "ai_off", label: "AI off" },
  { key: "admins", label: "Admins" },
];

const COLUMNS =
  "lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,0.8fr)]";

/** Small labels for what's unusual about an account. */
export function Badges({ user }: { user: AdminUser }) {
  const badges = [
    user.role === "admin" && {
      label: "Admin",
      className: "bg-surface-3 text-ink",
    },
    !user.is_active && { label: "Disabled", className: "bg-pin-soft text-pin" },
    !user.ai_enabled && { label: "AI off", className: "bg-tape-soft text-ink" },
    user.is_demo && {
      label: "Demo",
      className: "border border-line-strong text-ink-2",
    },
  ].filter(Boolean) as { label: string; className: string }[];
  if (!badges.length) return null;
  return (
    <span className="flex flex-wrap gap-1.5">
      {badges.map((badge) => (
        <span
          key={badge.label}
          className={cn(
            "rounded-full px-2 py-0.5 text-[0.75rem] font-semibold",
            badge.className,
          )}
        >
          {badge.label}
        </span>
      ))}
    </span>
  );
}

/** Tokens in the last 24 hours against the person's allowance. */
export function Allowance({ used, budget }: { used: number; budget: number }) {
  const part = share(used, budget);
  return (
    <span className="block">
      <span className="text-[0.875rem]">
        <span className="type-figure" title={`${exact(used)} tokens`}>
          {compact(used)}
        </span>
        <span className="text-ink-3">
          {budget > 0 ? ` of ${compact(budget)}` : " (no limit)"}
        </span>
      </span>
      {budget > 0 && (
        <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-surface-3">
          <span
            className={cn(
              "block h-full rounded-full",
              part >= 0.9 ? "bg-pin" : part >= 0.6 ? "bg-tape-deep" : "bg-ink",
            )}
            style={{ width: `${Math.max(part * 100, used ? 2 : 0)}%` }}
          />
        </span>
      )}
    </span>
  );
}

function Row({
  user,
  budget,
  onOpen,
}: {
  user: AdminUser;
  budget: number;
  onOpen: (id: string) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(user.id)}
        className={cn(
          "grid w-full gap-3 border-b border-line px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-surface-2/70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-chalk lg:items-center lg:gap-5 lg:px-5",
          COLUMNS,
        )}
      >
        <span className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden
            className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-3 text-[0.8125rem] font-bold"
          >
            {initials(user.name)}
          </span>
          <span className="min-w-0">
            <span className="block font-semibold leading-snug">
              {user.name}
            </span>
            <span className="block text-[0.875rem] text-ink-2 [overflow-wrap:anywhere]">
              {user.username ? `${user.username}, ` : ""}
              {user.email}
            </span>
            <span className="mt-1.5 block">
              <Badges user={user} />
            </span>
          </span>
        </span>
        <span className="text-[0.875rem] text-ink-2">
          {user.last_login_at ? (
            <>
              <span className="text-ink-3 lg:hidden">Last signed in </span>
              {relativeTime(user.last_login_at)}
            </>
          ) : (
            <>
              <span className="lg:hidden">Never signed in</span>
              <span className="hidden lg:inline">Never</span>
            </>
          )}
        </span>
        <span>
          <span className="block text-[0.8125rem] text-ink-3 lg:hidden">
            AI in the last 24 hours
          </span>
          <Allowance
            used={user.tokens_24h}
            budget={user.ai_daily_budget ?? budget}
          />
        </span>
        <span className="text-[0.875rem]">
          <span className="text-ink-3 lg:hidden">30 days </span>
          <span
            className="type-figure"
            title={`${exact(user.tokens_30d)} tokens`}
          >
            {compact(user.tokens_30d)}
          </span>
        </span>
      </button>
    </li>
  );
}

/** Everyone with an account: find them, filter them, open one. */
export function UsersPanel({
  defaultBudget,
  onOpen,
}: {
  defaultBudget: number;
  onOpen: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<UserStatus>("all");
  const [page, setPage] = useState(0);
  const users = useUsers(query, status, page);
  const total = users.data?.total ?? 0;
  const from = total ? page * PAGE_SIZE + 1 : 0;
  const to = Math.min((page + 1) * PAGE_SIZE, total);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[min(100%,18rem)] flex-1">
          <span className="sr-only">Search people</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
            placeholder="Name, email or username"
            className={cn(inputClass, "h-10 pl-9 pr-3")}
          />
        </label>
        <div
          role="radiogroup"
          aria-label="Show"
          className="flex flex-wrap gap-2"
        >
          {FILTERS.map((filter) => {
            const on = status === filter.key;
            return (
              <button
                key={filter.key}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  setStatus(filter.key);
                  setPage(0);
                }}
                className={cn(
                  "h-9 rounded-full border px-4 text-[0.875rem] font-medium transition-colors",
                  on
                    ? "border-primary bg-primary text-primary-ink"
                    : "border-line-strong text-ink-2 hover:text-ink",
                )}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-panel border border-line bg-surface">
        <div
          aria-hidden
          className={cn(
            "hidden gap-5 border-b border-line bg-surface-2/60 px-5 py-2.5 text-[0.8125rem] font-medium text-ink-3 lg:grid",
            COLUMNS,
          )}
        >
          <span>Person</span>
          <span>Last signed in</span>
          <span>AI, last 24 hours</span>
          <span>30 days</span>
        </div>
        {users.isPending ? (
          <div className="grid min-h-40 place-items-center">
            <Spinner className="size-6 text-ink-3" />
          </div>
        ) : users.isError ? (
          <p role="alert" className="p-5 text-pin">
            {users.error.message}
          </p>
        ) : users.data.items.length === 0 ? (
          <p className="p-8 text-center text-ink-2">
            {query.trim() ? "No one matches that search." : "No one here."}
          </p>
        ) : (
          <ul aria-busy={users.isFetching || undefined}>
            {users.data.items.map((user) => (
              <Row
                key={user.id}
                user={user}
                budget={defaultBudget}
                onOpen={onOpen}
              />
            ))}
          </ul>
        )}
      </div>

      {total > PAGE_SIZE && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[0.875rem] text-ink-2">
            {from} to {to} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={to >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
