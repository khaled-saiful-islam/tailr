import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";

const SIZE = 240;
const CENTER = SIZE / 2;
const RINGS = [36, 72, 108];
const MAX_BLIPS = 28;
const GOLDEN_ANGLE = 137.508;

function blip(index: number): { x: number; y: number } {
  // A golden-angle spiral spreads contacts evenly without looking like a grid.
  const angle = (index * GOLDEN_ANGLE * Math.PI) / 180;
  const radius = 22 + ((index * 41) % 84);
  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER + radius * Math.sin(angle),
  };
}

/**
 * The radar: dotted range rings, a sweeping beam, one contact per matching job.
 * The beam turns faster while a scan is running.
 */
export function RadarScope({
  contacts,
  scanning,
}: {
  contacts: number;
  scanning: boolean;
}) {
  const reduce = useReducedMotion();
  const gradientId = useId();
  const shown = Math.min(contacts, MAX_BLIPS);

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="h-auto w-full max-w-[15rem]"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--tape)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--tape)" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <circle
        cx={CENTER}
        cy={CENTER}
        r={RINGS[2]! + 8}
        className="fill-surface-2"
      />
      {RINGS.map((r) => (
        <circle
          key={r}
          cx={CENTER}
          cy={CENTER}
          r={r}
          fill="none"
          className="stroke-line-strong"
          strokeDasharray="2 5"
        />
      ))}
      <line
        x1={CENTER}
        y1={12}
        x2={CENTER}
        y2={SIZE - 12}
        className="stroke-line"
      />
      <line
        x1={12}
        y1={CENTER}
        x2={SIZE - 12}
        y2={CENTER}
        className="stroke-line"
      />

      {!reduce && (
        <g
          style={{
            transformBox: "view-box",
            transformOrigin: `${CENTER}px ${CENTER}px`,
            animation: `tailr-sweep ${scanning ? 1.6 : 7}s linear infinite`,
          }}
        >
          <path
            d={`M ${CENTER} ${CENTER} L ${CENTER + 116} ${CENTER} A 116 116 0 0 0 ${CENTER + 116 * Math.cos(-0.85)} ${CENTER + 116 * Math.sin(-0.85)} Z`}
            fill={`url(#${gradientId})`}
          />
          <line
            x1={CENTER}
            y1={CENTER}
            x2={CENTER + 116}
            y2={CENTER}
            className="stroke-tape-deep"
            strokeWidth="1.5"
          />
        </g>
      )}

      {Array.from({ length: shown }, (_, index) => {
        const { x, y } = blip(index);
        return (
          <g key={index}>
            {!reduce && index < 8 && (
              <circle
                cx={x}
                cy={y}
                r={4}
                className="fill-none stroke-ink"
                style={{
                  transformBox: "fill-box",
                  transformOrigin: "center",
                  opacity: 0,
                  animation: `tailr-ping 6s ease-out ${index * 0.9}s infinite`,
                }}
              />
            )}
            <motion.circle
              cx={x}
              cy={y}
              className="fill-ink"
              initial={{ r: 0 }}
              animate={{ r: 3.6 }}
              transition={{
                delay: 0.04 * index,
                type: "spring",
                stiffness: 400,
                damping: 18,
              }}
            />
          </g>
        );
      })}
      <circle
        cx={CENTER}
        cy={CENTER}
        r={4}
        className="fill-tape stroke-ink"
        strokeWidth="1.5"
      />
    </svg>
  );
}
