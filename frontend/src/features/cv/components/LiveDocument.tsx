import { useLayoutEffect, useRef, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";

const WIDTH = { A4: 794, Letter: 816 } as const;
const PAGE_HEIGHT = { A4: 1123, Letter: 1056 } as const;

/**
 * The CV exactly as it prints, scaled to fit. When it changes, the new version loads
 * behind the current one and swaps in once ready, so the preview never flashes blank.
 */
export function LiveDocument({
  src,
  paper,
  title,
  className,
}: {
  src: string;
  paper: "A4" | "Letter";
  title: string;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const [frames, setFrames] = useState<{
    shown: string | null;
    loading: string;
  }>({
    shown: null,
    loading: src,
  });
  const [height, setHeight] = useState<number>(PAGE_HEIGHT[paper]);
  const width = WIDTH[paper];

  if (src !== frames.loading && src !== frames.shown) {
    setFrames((current) => ({ ...current, loading: src }));
  }

  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      setScale(Math.min(1, element.clientWidth / width)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [width]);

  const onLoad = (url: string, frame: HTMLIFrameElement) => {
    const doc = frame.contentDocument;
    if (doc)
      setHeight(Math.max(PAGE_HEIGHT[paper], doc.documentElement.scrollHeight));
    setFrames((current) =>
      current.loading === url ? { shown: url, loading: url } : current,
    );
  };

  const urls = [
    ...new Set([frames.shown, frames.loading].filter(Boolean)),
  ] as string[];
  const pages = Math.max(1, Math.round(height / PAGE_HEIGHT[paper]));

  return (
    <div className={className}>
      <div
        ref={box}
        className="relative w-full"
        style={{ height: height * scale }}
      >
        {frames.shown === null && (
          <div className="absolute inset-0 grid place-items-center">
            <Spinner className="size-6 text-ink-3" />
          </div>
        )}
        {urls.map((url) => (
          <iframe
            key={url}
            src={url}
            title={title}
            onLoad={(event) => onLoad(url, event.currentTarget)}
            className={cn(
              "absolute left-0 top-0 origin-top-left bg-white shadow-sheet transition-opacity duration-200",
              url === frames.shown
                ? "opacity-100"
                : "pointer-events-none opacity-0",
            )}
            style={{ width, height, transform: `scale(${scale})`, border: 0 }}
            tabIndex={url === frames.shown ? 0 : -1}
            aria-hidden={url !== frames.shown || undefined}
          />
        ))}
      </div>
      <p className="mt-2 text-center text-[0.8125rem] text-ink-3">
        {pages === 1 ? "1 page" : `About ${pages} pages`}. Faint lines show
        where pages end.
      </p>
    </div>
  );
}
