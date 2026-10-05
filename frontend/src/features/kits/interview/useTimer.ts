/** A countdown for spoken answers: start, pause, reset; stops at zero. */
import { useEffect, useState } from "react";

export interface TimerState {
  left: number;
  total: number;
  running: boolean;
  toggle: () => void;
  reset: () => void;
}

export function useTimer(total: number): TimerState {
  const [left, setLeft] = useState(total);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const tick = window.setInterval(
      () => setLeft((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(tick);
  }, [running]);

  // Stop at zero.
  if (running && left === 0) setRunning(false);

  return {
    left,
    total,
    running,
    toggle: () => {
      if (left === 0) setLeft(total);
      setRunning((value) => !value);
    },
    reset: () => {
      setRunning(false);
      setLeft(total);
    },
  };
}
