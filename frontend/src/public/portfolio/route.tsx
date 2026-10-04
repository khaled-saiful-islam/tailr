/**
 * Where a visitor is on a portfolio: home, about, work, a project, or contact.
 *
 * On the live site this follows the address bar (/p/<slug>/work/<project>); in the
 * owner's preview it lives in memory so the app's own address never changes. In a
 * one-page portfolio, /about, /work and /contact scroll to their section on home.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import type { PublicPage } from "../types";
import {
  parseRoute,
  resolve,
  RouterContext,
  useRoute,
  type Route,
} from "./routing";

function scrollToSection(id: string): void {
  window.requestAnimationFrame(() =>
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" }),
  );
}

export function PortfolioRouter({
  page,
  preview,
  children,
}: {
  page: PublicPage;
  preview: boolean;
  children: ReactNode;
}) {
  const onePage = page.layout === "one_page";
  const base = `/p/${page.slug}`;
  const [memory, setMemory] = useState<Route>({ page: "home" });
  const [location, setLocation] = useState(() =>
    preview ? "" : window.location.pathname,
  );

  useEffect(() => {
    if (preview) return;
    const onPop = () => setLocation(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [preview]);

  const route = useMemo(
    () => resolve(preview ? memory : parseRoute(location, page.slug), onePage),
    [preview, memory, location, page.slug, onePage],
  );

  const href = useCallback(
    (to: Route) => {
      switch (to.page) {
        case "home":
          return to.section && to.section !== "experience"
            ? `${base}/${to.section}`
            : base;
        case "project":
          return `${base}/work/${to.path}`;
        default:
          return `${base}/${to.page}`;
      }
    },
    [base],
  );

  const go = useCallback(
    (to: Route) => {
      const target = resolve(to, onePage);
      if (preview) {
        setMemory(target);
      } else {
        window.history.pushState(null, "", href(target));
        setLocation(window.location.pathname);
      }
      if (target.page === "home" && target.section)
        scrollToSection(target.section);
      else window.scrollTo({ top: 0 });
    },
    [href, onePage, preview],
  );

  // Arriving at /p/<slug>/contact on a one-page site: scroll there once.
  useEffect(() => {
    if (route.page === "home" && route.section) scrollToSection(route.section);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({ route, href, go, onePage }),
    [route, href, go, onePage],
  );
  return (
    <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
  );
}

/** A link inside the portfolio: a real address, followed without a page load. */
export function PortfolioLink({
  to,
  className,
  children,
  ariaLabel,
}: {
  to: Route;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
}) {
  const { href, go } = useRoute();
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0)
      return;
    event.preventDefault();
    go(to);
  };
  return (
    <a
      href={href(to)}
      onClick={onClick}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </a>
  );
}
