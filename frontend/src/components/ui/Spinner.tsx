import { cn } from "@/lib/cn";

/** A spool of thread turning: Tailr's loading indicator. */
export function Spinner({
  className,
  label = "Loading",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="status"
      aria-label={label}
      className={cn(
        "size-5 animate-spin [animation-duration:900ms]",
        className,
      )}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeWidth="2.5"
      />
      <path
        d="M12 3a9 9 0 0 1 9 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="3 3.2"
      />
    </svg>
  );
}
