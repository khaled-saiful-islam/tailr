/** "18 seconds", "1 min 5 s": how long the CV has been reading. */
export function elapsedLabel(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min ${seconds % 60} s`;
}
