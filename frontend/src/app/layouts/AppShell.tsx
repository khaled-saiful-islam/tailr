import { motion } from "motion/react";
import { NavLink, Outlet } from "react-router";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";
import { useLiveConnection } from "@/lib/events";
import { useMe } from "@/features/auth/api";
import { NotificationBell } from "@/features/notifications/NotificationBell";
import { useSyncAccountTheme } from "@/features/settings/useSyncAccountTheme";
import { useNotificationAlerts } from "@/features/notifications/useNotificationAlerts";
import { TaskTray } from "@/features/tasks/TaskTray";
import { useTaskAlerts } from "@/features/tasks/useTaskAlerts";
import { navItems } from "../nav";
import { AccountMenu } from "./AccountMenu";

/**
 * Signed-in frame: a quiet left rail on desktop, a bottom tab bar on phones.
 * Pages render into the outlet and own their headers.
 */
export function AppShell() {
  useLiveConnection();
  useNotificationAlerts();
  useTaskAlerts();
  useSyncAccountTheme();
  const { data: me } = useMe();
  const railItems = navItems.filter(
    (item) => !item.adminOnly || me?.role === "admin",
  );
  const tabItems = navItems.filter((item) => !item.adminOnly);
  // A tab bar with a single tab is noise; it appears once there is a choice to make.
  const showTabBar = tabItems.length > 1;
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface px-4 py-5 lg:flex">
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
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3 rounded-control px-3 py-2.5 text-[0.9375rem] font-medium transition-colors",
                  isActive
                    ? "text-ink"
                    : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="rail-active"
                      className="absolute inset-0 rounded-control bg-surface-2"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 34,
                      }}
                    />
                  )}
                  {isActive && (
                    <motion.span
                      layoutId="rail-tape"
                      className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-tape"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 34,
                      }}
                    />
                  )}
                  <item.icon className="relative size-[18px]" aria-hidden />
                  <span className="relative">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto">
          <AccountMenu />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-canvas/90 px-4 py-3 backdrop-blur lg:hidden">
          <NavLink to="/" aria-label="Tailr, home">
            <Logo />
          </NavLink>
          <div className="flex items-center gap-1">
            <TaskTray side="bottom" align="end" />
            <NotificationBell side="bottom" align="end" />
            <AccountMenu compact />
          </div>
        </header>
        <main className={cn("flex-1 lg:pb-0", showTabBar && "pb-24")}>
          <Outlet />
        </main>
        {showTabBar && (
          <nav
            aria-label="Main"
            className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-surface/95 px-0.5 min-[360px]:px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5 backdrop-blur lg:hidden"
          >
            {tabItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-control py-1.5 text-[0.6875rem] font-medium leading-tight tracking-[-0.01em]",
                    isActive ? "text-ink" : "text-ink-2",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        "grid h-7 w-12 place-items-center rounded-full",
                        isActive && "bg-tape text-tape-ink",
                      )}
                    >
                      <item.icon className="size-[18px]" aria-hidden />
                    </span>
                    <span className="text-center">
                      {item.short ?? item.label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
