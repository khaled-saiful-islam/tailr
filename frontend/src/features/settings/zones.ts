/** Time zones and numbers for the settings page. Pure, so they're easy to test. */

export const HOME_ZONE = "Asia/Kuala_Lumpur";

/** Every IANA zone the browser knows, Kuala Lumpur first, then A to Z. */
export function timeZones(all: readonly string[] = supportedZones()): string[] {
  const rest = all.filter((zone) => zone !== HOME_ZONE).sort();
  return [HOME_ZONE, ...rest];
}

function supportedZones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return [HOME_ZONE, "Asia/Singapore", "Asia/Jakarta", "UTC"];
  }
}

/** "Asia/Kuala_Lumpur" reads as "Kuala Lumpur, Asia". */
export function zoneName(zone: string): string {
  const parts = zone.split("/");
  const city = (parts.pop() ?? zone).replace(/_/g, " ");
  return parts.length
    ? `${city}, ${parts.join(", ").replace(/_/g, " ")}`
    : city;
}

/** The zone's offset right now, like "GMT+8". */
export function zoneOffset(zone: string, now = new Date()): string {
  try {
    const part = new Intl.DateTimeFormat("en", {
      timeZone: zone,
      timeZoneName: "shortOffset",
    })
      .formatToParts(now)
      .find((p) => p.type === "timeZoneName");
    return part?.value ?? "";
  } catch {
    return "";
  }
}

/** Zones whose name or id contains every word typed, best matches first. */
export function searchZones(
  zones: readonly string[],
  query: string,
  limit = 60,
): string[] {
  const words = query
    .toLowerCase()
    .split(/[\s,/_]+/)
    .filter(Boolean);
  if (!words.length) return zones.slice(0, limit);
  const hits = zones.filter((zone) => {
    const text = `${zone} ${zoneName(zone)}`.toLowerCase();
    return words.every((word) => text.includes(word));
  });
  const starts = (zone: string) =>
    zoneName(zone).toLowerCase().startsWith(words[0]!) ? 0 : 1;
  return hits.sort((a, b) => starts(a) - starts(b)).slice(0, limit);
}

/** "12,400" or, for big numbers, "1.5M". */
export function tokens(value: number): string {
  if (value >= 100_000)
    return new Intl.NumberFormat("en", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  return new Intl.NumberFormat("en").format(value);
}

/** How full today's allowance is, 0 to 100. No limit reads as 0. */
export function share(used: number, budget: number): number {
  if (budget <= 0) return 0;
  return Math.min(100, Math.round((used / budget) * 100));
}
