import { LogoMark } from "@/components/brand/Logo";

export function FullPageLoader() {
  return (
    <div
      className="grid min-h-dvh place-items-center"
      role="status"
      aria-label="Loading Tailr"
    >
      <LogoMark className="size-10 animate-pulse" />
    </div>
  );
}
