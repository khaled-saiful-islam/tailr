import {
  BriefcaseBusiness,
  Radar,
  Sunrise,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** Main navigation. Each feature adds its entry here when it ships. */
export const navItems: NavItem[] = [
  { to: "/", label: "Today", icon: Sunrise },
  { to: "/jobs", label: "Jobs", icon: BriefcaseBusiness },
  { to: "/radar", label: "Radar", icon: Radar },
  { to: "/profile", label: "Profile", icon: UserRound },
];
