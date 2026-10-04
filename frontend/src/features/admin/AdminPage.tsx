import { ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useMe } from "@/features/auth/api";
import { useOverview, type Overview } from "./api";
import { Purposes } from "./components/Purposes";
import { Sources } from "./components/Sources";
import { UsageChart } from "./components/UsageChart";
import { UserSheet } from "./components/UserSheet";
import { UsersPanel } from "./components/UsersPanel";
import { compact, exact } from "./format";

function Card({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={title}
      className={`rounded-panel border border-line bg-surface p-5 sm:p-6 ${className ?? ""}`}
    >
      <h2 className="type-heading">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Figures({ overview }: { overview: Overview }) {
  const figures = [
    {
      label: "People",
      value: exact(overview.users),
      note: `${overview.active_7d} active and ${overview.new_7d} new this week`,
    },
    {
      label: "Disabled",
      value: exact(overview.disabled),
      note: overview.disabled ? "Can't sign in" : "Everyone can sign in",
    },
    {
      label: "AI tokens, 24 hours",
      value: compact(overview.tokens_24h),
      note: `${exact(overview.calls_24h)} calls, ${exact(overview.errors_24h)} failed`,
      tone: overview.errors_24h > 0 ? "warn" : undefined,
    },
    {
      label: "Default daily allowance",
      value: overview.default_budget
        ? compact(overview.default_budget)
        : "None",
      note: "Tokens per person a day, unless set",
    },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {figures.map((figure, index) => (
        <motion.div
          key={figure.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.35 }}
          className="rounded-panel border border-line bg-surface p-4 sm:p-5"
        >
          <dt className="text-[0.875rem] text-ink-2">{figure.label}</dt>
          <dd className="type-figure mt-1 text-[1.875rem] leading-none">
            {figure.value}
          </dd>
          <dd
            className={
              figure.tone === "warn"
                ? "mt-2 text-[0.8125rem] font-medium text-fit-stretch"
                : "mt-2 text-[0.8125rem] text-ink-3"
            }
          >
            {figure.note}
          </dd>
        </motion.div>
      ))}
    </dl>
  );
}

function NotForYou() {
  return (
    <div className="mx-auto max-w-[34rem] px-5 py-20 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-surface-2 text-ink-2">
        <ShieldCheck className="size-6" aria-hidden />
      </span>
      <h1 className="type-heading mt-5">This page is for administrators</h1>
      <p className="mt-2 text-ink-2">
        It's where admins look after accounts and AI use. Everything you need is
        on your own pages.
      </p>
      <Button asChild variant="secondary" className="mt-6">
        <Link to="/">Back to today</Link>
      </Button>
    </div>
  );
}

/** People, their AI use, and whether the job sites are answering. */
export function AdminPage() {
  const me = useMe();
  const isAdmin = me.data?.role === "admin";
  const overview = useOverview(isAdmin);
  const [params, setParams] = useSearchParams();
  const openId = params.get("user");
  const setOpen = (id: string | null) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (id) next.set("user", id);
        else next.delete("user");
        return next;
      },
      { replace: !id },
    );

  if (me.isPending) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Spinner className="size-7 text-ink-3" />
      </div>
    );
  }
  if (!isAdmin) return <NotForYou />;

  return (
    <div className="mx-auto w-full max-w-[76rem] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      <header>
        <h1 className="type-title">Admin</h1>
        <p className="mt-2 max-w-[40rem] text-ink-2">
          Who uses Tailr, how much AI they use, and whether the job sites are
          answering. Open a person to change their access.
        </p>
      </header>

      <div className="mt-8">
        {overview.isPending ? (
          <div className="grid min-h-40 place-items-center">
            <Spinner className="size-6 text-ink-3" />
          </div>
        ) : overview.isError ? (
          <p role="alert" className="text-pin">
            {overview.error.message}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <Figures overview={overview.data} />
            <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
              <Card title="AI use">
                <UsageChart
                  days={overview.data.days}
                  caption="Tokens a day, last 14 days"
                />
                <p className="mt-5 border-t border-line pt-4 text-[0.875rem] text-ink-2">
                  Last 30 days:{" "}
                  <span className="type-figure text-ink">
                    {exact(overview.data.tokens_30d)}
                  </span>{" "}
                  tokens. Each person's own allowance resets on a rolling 24
                  hours.
                </p>
              </Card>
              <Card title="What the AI did, last 30 days">
                <Purposes items={overview.data.purposes_30d} />
              </Card>
            </div>
            <Card title="Job sites, last 24 hours">
              <Sources sources={overview.data.sources} />
            </Card>
          </div>
        )}
      </div>

      <section aria-labelledby="people-heading" className="mt-12">
        <h2 id="people-heading" className="type-heading">
          People
        </h2>
        <div className="mt-4">
          <UsersPanel
            defaultBudget={overview.data?.default_budget ?? 0}
            onOpen={setOpen}
          />
        </div>
      </section>

      <UserSheet
        id={openId}
        selfId={me.data?.id}
        onClose={() => setOpen(null)}
      />
    </div>
  );
}
