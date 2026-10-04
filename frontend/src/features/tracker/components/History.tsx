import type { ApplicationDetail } from "../api";
import { dayLabel } from "../dates";
import { STAGE_LABEL } from "../stages";

type Event = ApplicationDetail["events"][number];

function sentence(event: Event): string {
  switch (event.kind) {
    case "added":
      return event.stage ? `Added to ${STAGE_LABEL[event.stage]}` : "Added";
    case "stage":
      return event.stage ? `Moved to ${STAGE_LABEL[event.stage]}` : "Moved";
    case "next_step":
      return `Next step: ${event.detail.text ?? "set"}`;
    case "followed_up":
      return "Followed up";
  }
}

/** What happened, newest first. */
export function History({ events }: { events: Event[] }) {
  if (!events.length) return null;
  return (
    <ol className="flex flex-col">
      {events.map((event) => (
        <li
          key={event.id}
          className="flex items-baseline justify-between gap-4 border-b border-line py-2 text-[0.875rem] last:border-b-0"
        >
          <span>{sentence(event)}</span>
          <span className="shrink-0 text-ink-3">{dayLabel(event.at)}</span>
        </li>
      ))}
    </ol>
  );
}
