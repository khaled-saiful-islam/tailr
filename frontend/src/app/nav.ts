import {
  BriefcaseBusiness,
  KanbanSquare,
  ShieldCheck,
  Radar,
  Sunrise,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Only administrators see it, and only in the side rail (phones: the account menu). */
  adminOnly?: boolean;
}

/** Main navigation. Each feature adds its entry here when it ships. */
export const navItems: NavItem[] = [
  { to: "/", label: "Today", icon: Sunrise },
  { to: "/jobs", label: "Jobs", icon: BriefcaseBusiness },
  { to: "/tracker", label: "Tracker", icon: KanbanSquare },
  { to: "/radar", label: "Radar", icon: Radar },
  { to: "/profile", label: "Profile", icon: UserRound },
  { to: "/admin", label: "Admin", icon: ShieldCheck, adminOnly: true },
];
