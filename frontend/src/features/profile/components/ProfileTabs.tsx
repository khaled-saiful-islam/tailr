import { NavLink } from "react-router";
import { cn } from "@/lib/cn";

const TABS = [
  { to: "/profile", label: "Details", end: true },
  { to: "/profile/cv", label: "CV", end: false },
  { to: "/profile/portfolio", label: "Portfolio", end: false },
];

/** Your profile, and the two things made from it: a CV and a portfolio site. */
export function ProfileTabs() {
  return (
    <nav
      aria-label="Profile"
      className="flex flex-wrap gap-1 rounded-control bg-surface-2 p-1 sm:w-fit"
    >
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            cn(
              "flex-1 rounded-[7px] px-4 py-1.5 text-center text-[0.9375rem] font-medium transition-[background-color,color,box-shadow] sm:flex-none",
              isActive
                ? "bg-surface text-ink shadow-[0_1px_2px_rgb(20_33_61/0.12)]"
                : "text-ink-2 hover:text-ink",
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
