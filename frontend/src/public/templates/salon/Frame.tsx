import type { ReactNode } from "react";
import { Entrance, Rise } from "../../motion";
import { ContactAction, MadeWithTailr, ModeAction } from "../../parts/actions";
import type { KitProps } from "../../portfolio/PortfolioSite";
import { PortfolioLink } from "../../portfolio/route";
import { navItems, useRoute } from "../../portfolio/routing";

function DesktopNav() {
  const { onePage, route } = useRoute();
  return (
    <nav aria-label="Sections" className="hidden @3xl:block">
      <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[0.9375rem]">
        {navItems(onePage).map((item) => {
          const active =
            !onePage &&
            (route.page === item.to.page ||
              (route.page === "project" && item.to.page === "work"));
          return (
            <li key={item.label}>
              <PortfolioLink
                to={item.to}
                className={`relative py-1 transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:bg-pg-ink after:transition-transform ${active ? "text-pg-ink after:scale-x-100" : "text-pg-ink-2 after:scale-x-0 hover:text-pg-ink hover:after:scale-x-100"}`}
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

/** On phones: a floating pill with the sections and an email button, in reach of a thumb. */
function FloatingNav({ page, preview }: KitProps) {
  const { onePage } = useRoute();
  return (
    <div className="pointer-events-none sticky bottom-4 z-30 flex justify-center px-3 @3xl:hidden">
      <nav
        aria-label="Sections"
        className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1 rounded-full border border-pg-line bg-pg/85 p-1.5 shadow-[0_18px_40px_-16px_rgb(0_0_0/0.35)] backdrop-blur"
      >
        {navItems(onePage).map((item) => (
          <PortfolioLink
            key={item.label}
            to={item.to}
            className="rounded-full px-3.5 py-2 text-[0.875rem] font-medium text-pg-ink-2 hover:bg-pg-ink/[0.06] hover:text-pg-ink"
          >
            {item.label}
          </PortfolioLink>
        ))}
        <ContactAction
          page={page}
          preview={preview}
          className="inline-flex items-center gap-1.5 rounded-full bg-pg-ink px-3.5 py-2 text-[0.875rem] font-semibold text-pg"
        >
          Email
        </ContactAction>
      </nav>
    </div>
  );
}

export function Frame(props: KitProps & { children: ReactNode }) {
  const { page, mode, onToggleMode, children } = props;
  return (
    <div className="min-h-dvh">
      <div className="mx-auto max-w-[88rem] px-5 @3xl:px-10">
        <Entrance>
          <Rise className="flex items-center justify-between gap-4 py-5">
            <PortfolioLink
              to={{ page: "home" }}
              className="text-[0.9375rem] font-semibold hover:text-pg-accent"
            >
              {page.name}
            </PortfolioLink>
            <div className="flex items-center gap-4">
              <DesktopNav />
              <ModeAction
                mode={mode}
                onToggle={onToggleMode}
                className="grid size-10 place-items-center rounded-full text-pg-ink-2 hover:bg-pg-ink/[0.06] hover:text-pg-ink"
              />
            </div>
          </Rise>
        </Entrance>
        <main className="min-w-0 pb-16">{children}</main>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-pg-line py-8 text-[0.875rem] text-pg-ink-3">
          <span>{page.name}</span>
          <MadeWithTailr className="hover:text-pg-ink" />
        </footer>
      </div>
      <FloatingNav {...props} />
    </div>
  );
}
