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
}

/** Main navigation. Each feature adds its entry here when it ships. */
export const navItems: NavItem[] = [
  { to: "/", label: "Home", icon: House },
  { to: "/jobs", label: "Jobs", icon: BriefcaseBusiness },
  { to: "/applications", label: "Applications", icon: KanbanSquare },
  { to: "/preferences", label: "Preferences", icon: SlidersHorizontal },
  { to: "/profile", label: "Profile", icon: UserRound },
  { to: "/admin", label: "Admin", icon: ShieldCheck, adminOnly: true },
];
