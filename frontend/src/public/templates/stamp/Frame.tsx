import { ArrowRight, ArrowUpRight, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { host, initials } from "../../format";
import { MadeWithTailr, ModeAction } from "../../parts/actions";
import { MobileBar } from "../../parts/MobileBar";
import { lastUpdated } from "../../portfolio/data";
import type { KitProps } from "../../portfolio/PortfolioSite";
import { PortfolioLink } from "../../portfolio/route";
import { navItems, useRoute, type Route } from "../../portfolio/routing";
import { Wrap } from "./shared";
import { red } from "./styles";

function isActive(current: Route, to: Route, onePage: boolean): boolean {
  if (onePage) return false;
  return (
    current.page === to.page ||
    (current.page === "project" && to.page === "work")
  );
}

/** Initials in an ink square, stamped red underneath. */
function Mark({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="grid size-10 shrink-0 place-items-center bg-pg-ink font-pg-display text-[0.9375rem] font-extrabold text-pg shadow-[3px_3px_0_var(--pg-accent)]"
    >
      {initials(name)}
    </span>
  );
}

/** Bar: in the header. List: in the footer. Big: the phone menu. */
function Nav({
  variant = "bar",
  onNavigate,
}: {
  variant?: "bar" | "list" | "big";
  onNavigate?: () => void;
}) {
  const { onePage, route } = useRoute();
  const big = variant === "big";
  return (
    <nav aria-label="Sections">
      <ul
        className={
          big
            ? "flex flex-col gap-3"
            : variant === "list"
              ? "flex flex-col items-start gap-1"
              : "flex items-center gap-7"
        }
        onClick={onNavigate}
      >
        {navItems(onePage).map((item) => {
          const active = isActive(route, item.to, onePage);
          return (
            <li key={item.label}>
              <PortfolioLink
                to={item.to}
                className={
                  big
                    ? `flex min-h-14 items-center justify-between border-[3px] border-pg-line px-5 font-pg-display text-[1.375rem] font-extrabold uppercase tracking-[-0.01em] ${active ? "bg-pg-ink text-pg" : "bg-pg shadow-[4px_4px_0_var(--stamp-shadow)]"}`
                    : `whitespace-nowrap py-2 text-[0.8125rem] font-bold uppercase tracking-[0.14em] underline-offset-[7px] hover:underline hover:decoration-[3px] hover:decoration-pg-accent ${active ? "underline decoration-[3px] decoration-pg-accent" : ""}`
                }
              >
                {item.label}
                {big && <ArrowRight className="size-5" aria-hidden />}
              </PortfolioLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Header({ page, mode, onToggleMode }: KitProps) {
  const [open, setOpen] = useState(false);
  const square =
    "grid size-11 place-items-center border-[3px] border-pg-line bg-pg text-pg-ink";
  return (
    <header className="sticky top-0 z-30 border-b-[3px] border-pg-line bg-pg">
      <Wrap className="flex items-center justify-between gap-4 py-3">
        <PortfolioLink
          to={{ page: "home" }}
          className="flex min-w-0 items-center gap-3"
        >
          <Mark name={page.name} />
          <span className="font-pg-display text-[1.125rem] font-extrabold uppercase leading-tight tracking-[-0.02em]">
            {page.name}
          </span>
        </PortfolioLink>
        <div className="flex shrink-0 items-center gap-3 @4xl:gap-6">
          <div className="hidden @4xl:block">
            <Nav />
          </div>
          <ModeAction mode={mode} onToggle={onToggleMode} className={square} />
          <span className="hidden @4xl:block">
            <PortfolioLink
              to={{ page: "contact" }}
              className={`${red} min-h-11 px-5`}
            >
              Say hello
            </PortfolioLink>
          </span>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className={`${square} @4xl:hidden`}
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
            className="overflow-hidden border-t-[3px] border-pg-line @4xl:hidden"
          >
            <Wrap className="pb-6 pt-5">
              <Nav variant="big" onNavigate={() => setOpen(false)} />
            </Wrap>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function Footer({ page }: KitProps) {
  const line = page.hero_line ?? page.headline;
  return (
    <footer className="border-t-[3px] border-pg-line bg-(--stamp-foot) pb-28 pt-14 @3xl:pb-12">
      <Wrap>
        <div className="grid gap-10 @3xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <div className="flex items-center gap-3">
              <Mark name={page.name} />
              <span className="font-pg-display text-[1.25rem] font-extrabold uppercase tracking-[-0.02em]">
                {page.name}
              </span>
            </div>
            {line && (
              <p className="mt-5 max-w-[26rem] border-l-[5px] border-pg-accent pl-4 text-[1.0625rem] font-medium leading-relaxed">
                {line}
              </p>
            )}
          </div>
          <div>
            <p className="inline-block border-b-[3px] border-pg-line pb-1 text-[0.8125rem] font-bold uppercase tracking-[0.14em]">
              On this site
            </p>
            <div className="mt-4">
              <Nav variant="list" />
            </div>
          </div>
          {page.links.length > 0 && (
            <div>
              <p className="inline-block border-b-[3px] border-pg-line pb-1 text-[0.8125rem] font-bold uppercase tracking-[0.14em]">
                Elsewhere
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {page.links.map((link) => (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="nofollow ugc noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[0.8125rem] font-bold uppercase tracking-[0.12em] hover:text-pg-accent"
                    >
                      {link.label || host(link.url)}
                      <ArrowUpRight className="size-4" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t-[3px] border-pg-line pt-6">
          <p className="text-[0.75rem] font-bold uppercase tracking-[0.14em]">
            {page.name}, updated {lastUpdated(page)}
          </p>
          <MadeWithTailr className="border-[3px] border-pg-line bg-pg-accent px-3 py-1.5 text-[0.75rem] font-bold uppercase tracking-[0.12em] text-pg-accent-ink shadow-[3px_3px_0_var(--stamp-shadow)]" />
        </div>
      </Wrap>
    </footer>
  );
}

export function Frame(props: KitProps & { children: ReactNode }) {
  return (
    <div className="min-h-dvh overflow-x-clip">
      <Header {...props} />
      <main>{props.children}</main>
      <Footer {...props} />
      <MobileBar
        {...props}
        hideAt="@3xl:hidden"
        bar="border-t-[3px] border-pg-line bg-pg"
        primary="border-[3px] border-pg-line bg-pg-accent font-bold uppercase tracking-[0.06em] text-pg-accent-ink"
        secondary="border-[3px] border-pg-line bg-pg font-bold uppercase tracking-[0.06em]"
        menu="rounded-none border-[3px] border-pg-line"
      />
    </div>
  );
}
