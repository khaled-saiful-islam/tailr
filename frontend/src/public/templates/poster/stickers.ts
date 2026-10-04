/** Poster stickers: their colours and tilts, and what they show. */
import { shows } from "../../format";
import type { PublicPage } from "../../types";

/** Sticker colours, in turn: hibiscus, sun, sky, ink. Text stays readable on each. */
export const STICKER_COLOURS = [
  "bg-pg-accent text-pg-accent-ink",
  "bg-pg-accent-2 text-[#111827]",
  "bg-pg-accent-3 text-white",
  "bg-pg-ink text-pg",
];
export const TILTS = [-3, 2.5, -1.5, 3];

/** What goes on the stickers: chosen highlights, or honest counts from the profile. */
export function stickers(page: PublicPage): { value: string; label: string }[] {
  if (shows(page, "highlights")) return page.highlights;
  const skills = page.skills.reduce(
    (sum, group) => sum + group.names.length,
    0,
  );
  const counts = [
    {
      value: String(page.projects.length),
      label: page.projects.length === 1 ? "project" : "projects",
    },
    {
      value: String(page.experiences.length),
      label: page.experiences.length === 1 ? "role" : "roles",
    },
    { value: String(skills), label: "skills" },
    {
      value: String(page.languages.length),
      label: page.languages.length === 1 ? "language" : "languages",
    },
  ];
  return counts.filter((count) => Number(count.value) > 0);
}
