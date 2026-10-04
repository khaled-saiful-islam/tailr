/** Stamp's styles: ink borders, hard shadows, stickers, and printed paper. */

export const shadow = "shadow-[6px_6px_0_var(--stamp-shadow)]";
export const box = `border-[3px] border-pg-line ${shadow}`;
export const lift =
  "transition-[transform,box-shadow] duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[9px_9px_0_var(--stamp-shadow)]";

const press =
  "inline-flex min-h-12 items-center justify-center gap-2.5 border-[3px] border-pg-line px-6 font-pg-display text-[0.875rem] font-extrabold uppercase tracking-[0.1em] shadow-[5px_5px_0_var(--stamp-shadow)] transition-[transform,box-shadow] duration-100 hover:-translate-x-px hover:-translate-y-px hover:shadow-[7px_7px_0_var(--stamp-shadow)] active:translate-x-[5px] active:translate-y-[5px] active:shadow-none";
export const red = `${press} bg-pg-accent text-pg-accent-ink`;
export const plain = `${press} bg-pg text-pg-ink`;

/** A small tag, like a price sticker. */
export const tag =
  "inline-flex items-center border-2 border-pg-line bg-pg px-2.5 py-1 text-[0.75rem] font-bold uppercase tracking-[0.08em]";

/** The rotating sticker colours. Text is always ink, readable on each. */
export const PASTELS = [
  "bg-(--stamp-cream)",
  "bg-(--stamp-sky)",
  "bg-(--stamp-mint)",
  "bg-(--stamp-blush)",
];
export const TILTS = [-2, 1.5, -1, 2.5, -2.5, 1];

/** Printed paper behind a section. */
export const PAPER = {
  plain: "bg-pg",
  cream:
    "bg-(--stamp-cream) bg-[linear-gradient(var(--pg-grid)_1px,transparent_1px),linear-gradient(90deg,var(--pg-grid)_1px,transparent_1px)] bg-[length:34px_34px]",
  mint: "bg-(--stamp-mint) bg-[radial-gradient(var(--pg-grid)_1.5px,transparent_1.5px)] bg-[length:22px_22px]",
  night:
    "bg-(--stamp-night) text-(--stamp-night-ink) bg-[linear-gradient(var(--stamp-night-grid)_1px,transparent_1px),linear-gradient(90deg,var(--stamp-night-grid)_1px,transparent_1px)] bg-[length:40px_40px]",
  red: "bg-pg-accent text-pg-accent-ink bg-[radial-gradient(rgb(0_0_0/0.12)_1.5px,transparent_1.5px)] bg-[length:24px_24px]",
} as const;
export type Paper = keyof typeof PAPER;
