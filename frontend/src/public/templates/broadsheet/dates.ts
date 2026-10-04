/** "Updated 4 October 2026", for the strip above the nameplate. */
export function updatedLine(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : `Updated ${date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`;
}
