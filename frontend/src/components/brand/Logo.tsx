import { cn } from "@/lib/cn";

/**
 * The Tailr mark: a "T" cut above a strip of measuring tape.
 * The wordmark widens on hover, as if being let out to fit.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={cn("size-8", className)}>
      <rect width="40" height="40" rx="10" className="fill-primary" />
      <rect x="6" y="24" width="28" height="9" rx="1.5" className="fill-tape" />
      <path
        d="M10 24v4M14 24v2.5M18 24v4M22 24v2.5M26 24v4M30 24v2.5"
        stroke="var(--tape-ink)"
        strokeWidth="1.2"
      />
      <path
        d="M12 10.5h16M20 10.5v10"
        className="stroke-primary-ink"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "group inline-flex items-center gap-2.5 text-ink",
        className,
      )}
    >
      <LogoMark />
      {!compact && (
        <span className="text-[1.375rem] font-[780] leading-none tracking-[-0.03em] transition-[font-stretch] duration-500 ease-tailor [font-stretch:108%] group-hover:[font-stretch:125%]">
          Tailr
        </span>
      )}
    </span>
  );
}
