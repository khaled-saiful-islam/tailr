import { ArrowUpRight, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { availabilityText, host, initials } from "../../format";
import { Entrance, MaskRise, Rise } from "../../motion";
import {
  ContactAction,
  CvAction,
  MadeWithTailr,
  ModeAction,
  ShareAction,
} from "../../parts/actions";
import { MobileBar } from "../../parts/MobileBar";
import { lastUpdated } from "../../portfolio/data";
import type { KitProps } from "../../portfolio/PortfolioSite";
import { PortfolioLink } from "../../portfolio/route";
import { navItems, useRoute } from "../../portfolio/routing";
import { grid, outline, solid, Ticks } from "./shared";

function Identity({ page }: KitProps) {
  const available = availabilityText(page);
  return (
    <>
      <Rise className="relative w-32 @5xl:w-40">
        <Ticks />
        {page.photo_url ? (
          <img
            src={page.photo_url}
            alt={page.name}
            className="aspect-square w-full border border-pg-line object-cover"
          />
        ) : (
          <div className="grid aspect-square w-full place-items-center bg-pg-accent-2 font-pg-display text-[3rem] font-black text-[#0b1e3a] [font-stretch:125%]">
            {initials(page.name)}
          </div>
        )}
      </Rise>
      <PortfolioLink to={{ page: "home" }} className="mt-7 block">
        <span
          data-fit
          className="block font-pg-display text-[clamp(2rem,8cqi,2.6rem)] font-extrabold leading-[0.98] tracking-[-0.02em] [font-stretch:125%] @5xl:text-[2.4rem]"
        >
          <MaskRise text={page.name} delay={0.1} />
        </span>
      </PortfolioLink>
      {page.headline && (
        <Rise>
          <p className="mt-3 text-[1.0625rem] leading-snug text-pg-ink-2">
            {page.headline}
          </p>
        </Rise>
      )}
      {available && (
        <Rise>
          <p className="mt-5 inline-flex items-center gap-2.5 rounded-[6px] border border-pg-accent/40 bg-pg-accent/[0.08] px-3 py-1.5 font-pg-mono text-[0.75rem] font-medium">
            <span
              className="size-2 shrink-0 rounded-full bg-pg-accent animate-pg-pulse"
              aria-hidden
            />
            {available}
          </p>
        </Rise>
      )}
    </>
  );
}

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const { onePage, route } = useRoute();
  return (
    <nav aria-label="Sections">
      <ul
        className="flex flex-col gap-1 font-pg-mono text-[0.875rem]"
        onClick={onNavigate}
      >
        {navItems(onePage).map((item, index) => {
          const active =
            !onePage &&
            (route.page === item.to.page ||
              (route.page === "project" && item.to.page === "work"));
          return (
            <li key={item.label}>
              <PortfolioLink
                to={item.to}
                className={`group flex items-center gap-3 rounded-[6px] px-2 py-2 transition-colors hover:bg-pg-ink/[0.05] ${active ? "text-pg-accent" : "text-pg-ink-2 hover:text-pg-ink"}`}
              >
                <span className="text-[0.75rem] text-pg-ink-3">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  className={`h-px transition-all ${active ? "w-10 bg-pg-accent" : "w-5 bg-pg-ink-3 group-hover:w-10 group-hover:bg-pg-ink"}`}
                  aria-hidden
                />
                {item.label}
              </PortfolioLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Links({ page }: KitProps) {
  if (!page.links.length) return null;
  return (
    <ul className="flex flex-col gap-1.5 font-pg-mono text-[0.8125rem]">
      {page.links.map((link) => (
        <li key={link.url}>
          <a
            href={link.url}
            target="_blank"
            rel="nofollow ugc noopener noreferrer"
            className="group inline-flex items-center gap-1.5 text-pg-accent hover:underline"
          >
            {link.label || host(link.url)}
            <span className="text-pg-ink-3">{host(link.url)}</span>
            <ArrowUpRight
              className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              aria-hidden
            />
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Phone and tablet: a slim bar with the name and a menu. */
function TopBar(props: KitProps) {
  const [open, setOpen] = useState(false);
  const { page, mode, onToggleMode } = props;
  return (
    <div className="sticky top-0 z-30 border-b border-pg-line bg-pg/90 backdrop-blur @5xl:hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-3">
        <PortfolioLink
          to={{ page: "home" }}
          className="font-pg-mono text-[0.8125rem] font-semibold"
        >
          ~/{page.slug}
        </PortfolioLink>
        <div className="flex items-center gap-1">
          <ModeAction
            mode={mode}
            onToggle={onToggleMode}
            className="grid size-10 place-items-center rounded-[6px] text-pg-ink-2 hover:bg-pg-ink/[0.06]"
          />
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid size-10 place-items-center rounded-[6px] text-pg-ink hover:bg-pg-ink/[0.06]"
          >
            {open ? (
              <X className="size-5" aria-hidden />
            ) : (
              <Menu className="size-5" aria-hidden />
            )}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-pg-line px-3 pb-4"
          >
            <div className="pt-3">
              <Nav onNavigate={() => setOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Frame(props: KitProps & { children: ReactNode }) {
  const { page, mode, onToggleMode, preview, children } = props;
  return (
    <div className={`min-h-dvh ${grid} [background-size:32px_32px]`}>
      <TopBar {...props} />
      <div className="mx-auto max-w-[84rem] px-5 py-8 @3xl:px-10 @5xl:grid @5xl:grid-cols-[19rem_minmax(0,1fr)] @5xl:gap-16 @5xl:py-14 @6xl:grid-cols-[21rem_minmax(0,1fr)]">
        <aside className="hidden @5xl:sticky @5xl:top-10 @5xl:flex @5xl:max-h-[calc(100dvh-5rem)] @5xl:flex-col @5xl:self-start">
          <Entrance className="flex flex-col">
            <Rise className="mb-6 flex items-center justify-between">
              <span className="font-pg-mono text-[0.75rem] text-pg-ink-3">
                ~/{page.slug}
              </span>
              <ModeAction
                mode={mode}
                onToggle={onToggleMode}
                className="grid size-10 place-items-center rounded-[6px] text-pg-ink-2 hover:bg-pg-ink/[0.06] hover:text-pg-ink"
              />
            </Rise>
            <Identity {...props} />
            <Rise className="mt-8">
              <Nav />
            </Rise>
            <Rise className="mt-6">
              <Links {...props} />
            </Rise>
            <Rise className="mt-7 flex flex-wrap gap-2">
              <ContactAction page={page} preview={preview} className={solid} />
              {page.cv_url && (
                <CvAction page={page} preview={preview} className={outline} />
              )}
              <ShareAction
                page={page}
                className={outline}
                menuClassName="rounded-[6px]"
              />
            </Rise>
          </Entrance>
        </aside>

        <main className="min-w-0">
          <div className="mb-10 @5xl:hidden">
            <Entrance className="flex flex-col">
              <Identity {...props} />
            </Entrance>
          </div>
          {children}
          <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-pg-line pt-6 font-pg-mono text-[0.75rem] text-pg-ink-3">
            <span>last updated {lastUpdated(page)}</span>
            <MadeWithTailr className="hover:text-pg-ink" />
          </footer>
        </main>
      </div>
      <MobileBar
        {...props}
        page={{ ...page, cv_url: page.cv_url }}
        bar="border-t border-pg-line bg-pg-2/95 backdrop-blur"
        primary="rounded-[6px] bg-pg-accent font-pg-mono text-[0.75rem] font-semibold text-pg-accent-ink"
        secondary="rounded-[6px] border border-pg-ink/25 font-pg-mono text-[0.75rem] font-semibold"
        menu="rounded-[6px]"
      />
    </div>
  );
}
