import { motion } from "motion/react";
import { Panel } from "@/components/ui/controls";
import type { PageSettingsOut } from "../api";

const SOURCE_LABEL: Record<string, string> = {
  linkedin: "LinkedIn",
  whatsapp: "WhatsApp",
  qr: "QR code",
  other: "Elsewhere",
};
const DAYS = 30;

/** Visits over the last 30 days: people only, once a day each, never you. */
export function ViewsPanel({ stats }: { stats: PageSettingsOut["stats"] }) {
  const byDay = new Map(stats.days.map((day) => [day.day, day.views]));
  const today = new Date();
  const series = Array.from({ length: DAYS }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (DAYS - 1 - index));
    const key = day.toISOString().slice(0, 10);
    return { key, views: byDay.get(key) ?? 0 };
  });
  const peak = Math.max(1, ...series.map((d) => d.views));
  const sources = Object.entries(stats.sources).sort((a, b) => b[1] - a[1]);

  return (
    <Panel
      title="Visits"
      description="People who opened your website in the last 30 days. Bots and you aren't counted."
    >
      <p className="text-[2.5rem] font-bold leading-none [font-stretch:120%]">
        {stats.last_30_days}
      </p>
      <div
        className="mt-4 flex h-16 items-end gap-[3px]"
        role="img"
        aria-label={`${stats.last_30_days} visits in the last 30 days`}
      >
        {series.map((day, index) => (
          <motion.span
            key={day.key}
            title={`${day.key}: ${day.views}`}
            className="flex-1 rounded-t-[2px] bg-tape"
            initial={{ height: 0 }}
            animate={{ height: `${Math.max(4, (day.views / peak) * 100)}%` }}
            transition={{ delay: index * 0.012, duration: 0.4 }}
            style={{ opacity: day.views ? 1 : 0.25 }}
          />
        ))}
      </div>
      {sources.length > 0 && (
        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[0.9375rem]">
          {sources.map(([source, count]) => (
            <div key={source}>
              <dt className="text-ink-3">{SOURCE_LABEL[source] ?? source}</dt>
              <dd className="font-semibold">{count}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="mt-4 text-[0.8125rem] text-ink-3">
        Share your link on LinkedIn and WhatsApp, or print the QR code on your
        CV, to see where visits come from.
      </p>
    </Panel>
  );
}
