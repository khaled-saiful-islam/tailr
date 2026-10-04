/** Converting between stored instants and the browser's date and time inputs (local time). */

const pad = (n: number) => String(n).padStart(2, "0");

export function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toDateTimeInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${toDateInput(iso)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** A day the user picked, as 9 am that day in their time zone. */
export function fromDateInput(value: string): string | null {
  return value ? new Date(`${value}T09:00`).toISOString() : null;
}

export function fromDateTimeInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function dayLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-MY", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}
