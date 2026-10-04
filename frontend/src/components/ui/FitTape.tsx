import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useId } from "react";
import { cn } from "@/lib/cn";
import { fitLabel, fitLevel, type FitLevel } from "./fit";

const levelText: Record<FitLevel, string> = {
  strong: "text-fit-strong",
  good: "text-fit-good",
  stretch: "text-fit-stretch",
  low: "text-fit-low",
};

interface FitTapeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  /** Animate the tape measuring out to the score when it mounts or changes. */
  animated?: boolean;
  showLabel?: boolean;
  className?: string;
}

const geometry = {
  sm: { width: 96, height: 18, figure: "text-[0.9375rem]" },
  md: { width: 168, height: 22, figure: "text-xl" },
  lg: { width: 280, height: 30, figure: "text-[2.75rem]" },
} as const;

/**
 * The Fit tape: a strip of measuring tape with a pin at the match score.
 * Tailr shows every match this way, so a glance reads like a tailor's measure.
 */
export function FitTape({ score, size = "md", animated = true, showLabel = false, className }: FitTapeProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const reduce = useReducedMotion();
  const { width, height, figure } = geometry[size];
  const level = fitLevel(clamped);
  const clipId = useId();

  const progress = useMotionValue(animated && !reduce ? 0 : clamped);
  const markerX = useTransform(progress, (v) => (v / 100) * width);
  const shown = useTransform(progress, (v) => Math.round(v).toString());

  useEffect(() => {
    if (!animated || reduce) {
      progress.set(clamped);
      return;
    }
    const controls = animate(progress, clamped, { duration: 1.1, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [animated, reduce, clamped, progress]);

  return (
    <div
      className={cn("inline-flex items-center gap-3", size === "lg" && "flex-col items-start gap-2", className)}
      role="img"
      aria-label={`${fitLabel[level]}: ${clamped} percent match`}
    >
      {size === "lg" && (
        <div className="flex items-baseline gap-3">
          <motion.span className={cn("type-figure leading-none text-ink", figure)}>{shown}</motion.span>
          <span className={cn("type-label whitespace-nowrap", levelText[level])}>{fitLabel[level]}</span>
        </div>
      )}
      <svg width={width} height={height + 8} viewBox={`0 -4 ${width} ${height + 8}`} className="shrink-0 overflow-visible">
        <defs>
          <clipPath id={clipId}>
            <motion.rect x="0" y="0" height={height} rx="2" width={markerX} />
          </clipPath>
        </defs>
        {/* The track beyond the score, with faint ticks. */}
        <rect x="0" y="0" width={width} height={height} rx="2" className="fill-surface-3" />
        <Ticks width={width} height={height} className="stroke-ink" faint />
        {/* The measured part: bright tape with dark ticks, clipped at the pin. */}
        <g clipPath={`url(#${clipId})`}>
          <rect x="0" y="0" width={width} height={height} rx="2" className="fill-tape" />
          <Ticks width={width} height={height} className="stroke-tape-ink" />
        </g>
        {/* The pin at the score. */}
        <motion.g style={{ x: markerX }}>
          <line x1="0" x2="0" y1={-4} y2={height + 4} stroke="var(--ink)" strokeWidth="2" />
          <circle cx="0" cy={-4} r="3" className="fill-ink" />
        </motion.g>
      </svg>
      {size !== "lg" && (
        <span className="flex items-baseline gap-2">
          <motion.span className={cn("type-figure leading-none text-ink", figure)}>{shown}</motion.span>
          {showLabel && (
            <span className={cn("type-label whitespace-nowrap", levelText[level])}>{fitLabel[level]}</span>
          )}
        </span>
      )}
    </div>
  );
}

const TICKS = Array.from({ length: 51 }, (_, i) => i * 2);

function Ticks({ width, height, className, faint = false }: { width: number; height: number; className: string; faint?: boolean }) {
  return (
    <g className={className}>
      {TICKS.map((t) => {
        const x = (t / 100) * width;
        const major = t % 10 === 0;
        const h = major ? height * 0.55 : t % 10 === 5 ? height * 0.4 : height * 0.25;
        const opacity = faint ? (major ? 0.35 : 0.18) : major ? 0.8 : 0.5;
        return <line key={t} x1={x} x2={x} y1={0} y2={h} strokeOpacity={opacity} strokeWidth={major ? 1.1 : 0.8} />;
      })}
    </g>
  );
}
