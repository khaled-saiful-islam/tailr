import {
  BriefcaseBusiness,
  KanbanSquare,
  ShieldCheck,
  SlidersHorizontal,
  House,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Only administrators see it, and only in the side rail (phones: the account menu). */
  adminOnly?: boolean;
  /** A shorter label for the phone tab bar, where five tabs share the width. */
  short?: string;
  /** Other places that belong under this item (a prepared application is part of Jobs). */
  also?: string[];
}

/** Main navigation. Each feature adds its entry here when it ships. */
export const navItems: NavItem[] = [
  { to: "/", label: "Home", icon: House },
  { to: "/jobs", label: "Jobs", icon: BriefcaseBusiness, also: ["/apply"] },
  { to: "/applications", label: "Applications", icon: KanbanSquare },
  { to: "/preferences", label: "Preferences", icon: SlidersHorizontal },
  { to: "/profile", label: "Profile", icon: UserRound },
  { to: "/admin", label: "Admin", icon: ShieldCheck, adminOnly: true },
];

const under = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`);

/** Whether the menu should show this item as the page you're on. */
export function isNavActive(item: NavItem, pathname: string): boolean {
  if (item.to === "/") return pathname === "/";
  return [item.to, ...(item.also ?? [])].some((base) => under(pathname, base));
}
