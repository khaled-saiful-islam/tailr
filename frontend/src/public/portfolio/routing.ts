/** Portfolio addresses and the hooks sections use; the router itself is in route.tsx. */
import { createContext, useContext } from "react";

export type SectionId = "about" | "work" | "experience" | "contact";

export type Route =
  | { page: "home"; section?: SectionId }
  | { page: "about" }
  | { page: "work" }
  | { page: "contact" }
  | { page: "project"; path: string };

export interface RouterValue {
  route: Route;
  href: (route: Route) => string;
  go: (route: Route) => void;
  onePage: boolean;
}

export const RouterContext = createContext<RouterValue | null>(null);

export function parseRoute(pathname: string, slug: string): Route {
  const rest = pathname.replace(new RegExp(`^/p/${slug}/?`), "");
  const [first, second] = rest.split("/").filter(Boolean);
  if (first === "work" && second) return { page: "project", path: second };
  if (first === "about" || first === "work" || first === "contact")
    return { page: first };
  return { page: "home" };
}

/** One page: about/work/contact are sections of home. */
export function resolve(route: Route, onePage: boolean): Route {
  return onePage &&
    (route.page === "about" ||
      route.page === "work" ||
      route.page === "contact")
    ? { page: "home", section: route.page }
    : route;
}

export function useRoute(): RouterValue {
  const value = useContext(RouterContext);
  if (!value) throw new Error("useRoute must be used inside PortfolioRouter");
  return value;
}

/** The navigation every template shows, in its own style. */
export function navItems(onePage: boolean): { label: string; to: Route }[] {
  return onePage
    ? [
        { label: "About", to: { page: "home", section: "about" } },
        { label: "Work", to: { page: "home", section: "work" } },
        { label: "Experience", to: { page: "home", section: "experience" } },
        { label: "Contact", to: { page: "home", section: "contact" } },
      ]
    : [
        { label: "About", to: { page: "about" } },
        { label: "Work", to: { page: "work" } },
        { label: "Contact", to: { page: "contact" } },
      ];
}
