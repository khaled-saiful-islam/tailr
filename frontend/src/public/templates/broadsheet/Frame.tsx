import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import {
  ContactAction,
  CvAction,
  MadeWithTailr,
  ModeAction,
  ShareAction,
} from "../../parts/actions";
import { MobileBar } from "../../parts/MobileBar";
import type { KitProps } from "../../portfolio/PortfolioSite";
import { PortfolioLink } from "../../portfolio/route";
import { navItems, useRoute } from "../../portfolio/routing";
import { updatedLine } from "./dates";
import { textLink, ui } from "./shared";

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const { onePage, route } = useRoute();
  return (
    <nav aria-label="Sections">
      <ul
        className="flex flex-col gap-1 @3xl:flex-row @3xl:flex-wrap @3xl:items-center @3xl:gap-x-5 @3xl:gap-y-2"
        onClick={onNavigate}
      >
        {navItems(onePage).map((item) => {
          const active =
            !onePage &&
            (route.page === item.to.page ||
              (route.page === "project" && item.to.page === "work"));
          return (
            <li key={item.label}>
              <PortfolioLink
                to={item.to}
                className={`${textLink} py-2 @3xl:py-0 ${active ? "text-pg-accent decoration-pg-accent" : ""}`}
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

/** The strip above the nameplate: date (or name), sections, actions. */
function Strip(props: KitProps) {
  const { page, mode, onToggleMode, preview } = props;
  const { route } = useRoute();
  const [open, setOpen] = useState(false);
  const home = route.page === "home";

  const toggle = (
    <ModeAction
      mode={mode}
      onToggle={onToggleMode}
      className="grid size-10 place-items-center rounded-full text-pg-ink-2 hover:bg-pg-ink/[0.06] hover:text-pg-ink"
    />
  );

  return (
    <div className="sticky top-0 z-30 -mx-5 bg-pg/95 px-5 backdrop-blur @3xl:static @3xl:mx-0 @3xl:bg-transparent @3xl:px-0 @3xl:backdrop-blur-none">
      <div className="flex items-center justify-between gap-x-6 gap-y-3 py-3 @3xl:flex-wrap @3xl:py-4">
        {home ? (
          <p
            className={`${ui} hidden text-[0.8125rem] text-pg-ink-3 @3xl:block`}
          >
            {updatedLine(page.updated_at)}
          </p>
        ) : null}
        <PortfolioLink
          to={{ page: "home" }}
          className={`font-pg-display text-[1.375rem] font-semibold leading-tight tracking-[-0.01em] ${home ? "@3xl:hidden" : ""}`}
        >
          {page.name}
        </PortfolioLink>

        <div className="hidden flex-wrap items-center gap-x-6 gap-y-2 @3xl:flex">
          <Nav />
          <span className="h-5 w-px bg-pg-line" aria-hidden />
          <span className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <ContactAction page={page} preview={preview} className={textLink} />
            <CvAction page={page} preview={preview} className={textLink} />
            <ShareAction
              page={page}
              className={textLink}
              menuClassName="rounded-none"
            />
          </span>
          {toggle}
        </div>

        <div className="flex items-center gap-1 @3xl:hidden">
          {toggle}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid size-10 place-items-center text-pg-ink hover:bg-pg-ink/[0.06]"
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
            className="overflow-hidden border-t border-pg-ink @3xl:hidden"
          >
            <div className="pb-4 pt-2">
              <Nav onNavigate={() => setOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {!home && <div className="h-[5px] bg-pg-ink" aria-hidden />}
    </div>
  );
}

export function Frame(props: KitProps & { children: ReactNode }) {
  const { page, children } = props;
  const { route } = useRoute();
  return (
    <div className="min-h-dvh">
      <div className="mx-auto max-w-[76rem] px-5 pb-16 @3xl:px-10">
        <Strip {...props} />
        <main className={route.page === "home" ? "" : "mt-10"}>{children}</main>
        <footer
          className={`${ui} mt-16 flex flex-wrap items-center justify-between gap-3 border-t-[3px] border-pg-ink pt-4 text-[0.8125rem] text-pg-ink-3`}
        >
          <span>
            {page.name}
            {page.location ? `, ${page.location}` : ""}
          </span>
          <MadeWithTailr className="hover:text-pg-ink" />
        </footer>
      </div>
      <MobileBar
        {...props}
        hideAt="@3xl:hidden"
        bar="border-t-[3px] border-pg-ink bg-pg/95 backdrop-blur"
        primary="bg-pg-ink font-pg-mono text-[0.8125rem] font-semibold text-pg"
        secondary="border border-pg-ink font-pg-mono text-[0.8125rem] font-semibold"
        menu="rounded-none"
      />
    </div>
  );
}
