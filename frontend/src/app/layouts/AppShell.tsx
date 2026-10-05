import { motion } from "motion/react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";
import { useLiveConnection } from "@/lib/events";
import { useMe } from "@/features/auth/api";
import { NotificationBell } from "@/features/notifications/NotificationBell";
import { AppearanceButton } from "@/features/settings/components/AppearanceButton";
import { useSyncAccountTheme } from "@/features/settings/useSyncAccountTheme";
import { useNotificationAlerts } from "@/features/notifications/useNotificationAlerts";
import { TaskTray } from "@/features/tasks/TaskTray";
import { useTaskAlerts } from "@/features/tasks/useTaskAlerts";
import { isNavActive, navItems, type NavItem } from "../nav";
import { AccountMenu } from "./AccountMenu";

const slide = { type: "spring", stiffness: 420, damping: 34 } as const;

function RailLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      to={item.to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-control px-3 py-2.5 text-[0.9375rem] font-medium transition-colors",
        active ? "text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
      )}
    >
      {active && (
        <motion.span
          layoutId="rail-active"
          className="absolute inset-0 rounded-control bg-[linear-gradient(90deg,color-mix(in_oklab,var(--tape)_24%,transparent),color-mix(in_oklab,var(--tape)_6%,transparent)_70%,transparent)]"
          transition={slide}
        />
      )}
      {active && (
        <motion.span
          layoutId="rail-tape"
          className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-tape"
          transition={slide}
        />
      )}
      <item.icon
        className="relative size-[18px] transition-transform duration-200 ease-tailor group-hover:-translate-y-px"
        aria-hidden
      />
      <span className="relative">{item.label}</span>
    </Link>
  );
}

function TabLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      to={item.to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "press flex min-w-0 flex-1 flex-col items-center gap-1 rounded-control py-1.5 text-[0.6875rem] font-medium leading-tight tracking-[-0.01em]",
        active ? "text-ink" : "text-ink-2",
      )}
    >
      <span className="relative grid h-7 w-12 place-items-center">
        {active && (
          <motion.span
            layoutId="tab-pill"
            className="absolute inset-0 rounded-full bg-tape"
            transition={slide}
          />
        )}
        <item.icon
          className={cn("relative size-[18px]", active && "text-tape-ink")}
          aria-hidden
        />
      </span>
      <span className="text-center">{item.short ?? item.label}</span>
    </Link>
  );
}

/**
 * Signed-in frame: a quiet left rail on desktop, a bottom tab bar on phones.
 * Pages render into the outlet, rising gently into place, and own their headers.
 */
export function AppShell() {
  useLiveConnection();
  useNotificationAlerts();
  useTaskAlerts();
  useSyncAccountTheme();
  const { pathname } = useLocation();
  const { data: me } = useMe();
  const railItems = navItems.filter(
    (item) => !item.adminOnly || me?.role === "admin",
  );
  const tabItems = navItems.filter((item) => !item.adminOnly);
  // A tab bar with a single tab is noise; it appears once there is a choice to make.
  const showTabBar = tabItems.length > 1;
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-rail px-4 py-5 lg:flex">
        <div className="mb-8 flex items-center justify-between gap-2">
          <NavLink
            to="/"
            className="w-fit rounded-control px-2"
            aria-label="Tailr, home"
          >
            <Logo />
          </NavLink>
          <div className="flex items-center">
            <TaskTray side="bottom" align="start" />
            <NotificationBell side="bottom" align="start" />
          </div>
        </div>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {railItems.map((item) => (
            <RailLink
              key={item.to}
              item={item}
              active={isNavActive(item, pathname)}
            />
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1">
          <AppearanceButton variant="row" side="right" align="end" />
          <div className="border-t border-line pt-2">
            <AccountMenu />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-line bg-canvas/85 px-4 py-3 backdrop-blur-md lg:hidden">
          <NavLink to="/" aria-label="Tailr, home">
            <Logo />
          </NavLink>
          <div className="flex items-center gap-0.5">
            <TaskTray side="bottom" align="end" />
            <NotificationBell side="bottom" align="end" />
            <AppearanceButton side="bottom" align="end" />
            <AccountMenu compact />
          </div>
        </header>
        <main className={cn("flex-1 lg:pb-0", showTabBar && "pb-24")}>
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          >
            <Outlet />
          </motion.div>
        </main>
        {showTabBar && (
          <nav
            aria-label="Main"
            className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-rail/90 px-0.5 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5 backdrop-blur-md min-[360px]:px-2 lg:hidden"
          >
            {tabItems.map((item) => (
              <TabLink
                key={item.to}
                item={item}
                active={isNavActive(item, pathname)}
              />
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
