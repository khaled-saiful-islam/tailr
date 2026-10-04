import { Sunrise, type LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** Main navigation. Each feature adds its entry here when it ships. */
export const navItems: NavItem[] = [{ to: "/", label: "Today", icon: Sunrise }];
