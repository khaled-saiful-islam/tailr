import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { MadeWithTailr, ModeAction } from "../../parts/actions";
import { MobileBar } from "../../parts/MobileBar";
import { lastUpdated } from "../../portfolio/data";
import type { KitProps } from "../../portfolio/PortfolioSite";
import { PortfolioLink } from "../../portfolio/route";
import { navItems, useRoute, type Route } from "../../portfolio/routing";
import { Wrap } from "./shared";

function isActive(current: Route, to: Route, onePage: boolean): boolean {
  if (onePage) return false;
  return (
    current.page === to.page ||
    (current.page === "project" && to.page === "work")
  );
}

/** Nav as pills: in the bar on wide screens, as a big sheet on phones. */
function NavPills({
  big = false,
  onNavigate,
}: {
  big?: boolean;
  onNavigate?: () => void;
}) {
  const { onePage, route } = useRoute();
  return (
    <nav aria-label="Sections">
      <ul
        className={
          big ? "flex flex-col gap-2" : "flex flex-wrap items-center gap-1.5"
        }
        onClick={onNavigate}
      >
        {navItems(onePage).map((item) => {
          const active = isActive(route, item.to, onePage);
          return (
            <li key={item.label}>
              <PortfolioLink
                to={item.to}
                className={`inline-flex items-center rounded-full font-bold transition-colors ${
                  big
                    ? "min-h-14 w-full px-6 text-[1.25rem]"
                    : "min-h-10 px-4 text-[0.9375rem]"
                } ${
                  active
                    ? "bg-pg-ink text-pg"
                    : big
                      ? "bg-pg-2 shadow-[0_2px_0_rgb(0_0_0/0.06)] hover:bg-pg-accent-2 hover:text-[#111827]"
                      : "hover:bg-pg-2"
                }`}
              >
                {item.label}
              </PortfolioLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function TopBar({ page, mode, onToggleMode }: KitProps) {
  const [open, setOpen] = useState(false);
  const short = page.name.split(" ")[0] || page.name;
  return (
    <div className="sticky top-0 z-30 border-b border-pg-line/70 bg-pg/85 backdrop-blur">
      <Wrap className="flex items-center justify-between gap-3 py-3">
        <PortfolioLink
          to={{ page: "home" }}
          className="font-pg-display text-[1.125rem] font-extrabold tracking-[-0.02em]"
        >
          {short}
          <span className="text-pg-accent">.</span>
        </PortfolioLink>
        <div className="flex items-center gap-2">
          <div className="hidden @3xl:block">
            <NavPills />
          </div>
          <ModeAction
            mode={mode}
            onToggle={onToggleMode}
            className="grid size-11 place-items-center rounded-full bg-pg-2 text-pg-ink shadow-[0_2px_0_rgb(0_0_0/0.1)]"
          />
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid size-11 place-items-center rounded-full bg-pg-ink text-pg @3xl:hidden"
          >
            {open ? (
              <X className="size-5" aria-hidden />
            ) : (
              <Menu className="size-5" aria-hidden />
            )}
          </button>
        </div>
      </Wrap>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden @3xl:hidden"
          >
            <Wrap className="pb-5 pt-2">
              <NavPills big onNavigate={() => setOpen(false)} />
            </Wrap>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Frame(props: KitProps & { children: ReactNode }) {
  const { page, children } = props;
  return (
    <div className="min-h-dvh overflow-x-clip">
      <TopBar {...props} />
      <main>{children}</main>
      <footer className="pb-10 pt-6">
        <Wrap className="flex flex-wrap items-center justify-between gap-3 text-[0.875rem] font-semibold text-pg-ink-3">
          <span>
            {page.name}
            <span className="font-normal">, updated {lastUpdated(page)}</span>
          </span>
          <MadeWithTailr className="hover:text-pg-ink" />
        </Wrap>
      </footer>
      <MobileBar
        {...props}
        hideAt="@3xl:hidden"
        bar="border-t border-pg-line bg-pg/95 backdrop-blur"
        primary="rounded-full bg-pg-ink font-bold text-pg"
        secondary="rounded-full border-2 border-pg-ink font-bold"
        menu="rounded-3xl"
      />
    </div>
  );
}
