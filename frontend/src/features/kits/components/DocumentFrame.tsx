import { useLayoutEffect, useRef, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";

const PAGE_WIDTH = 794; // A4 at 96 dpi

/**
 * The real document (the same HTML the PDF is printed from), scaled to fit.
 * Served from our own API, so the frame can measure its height.
 */
export function DocumentFrame({ src, title }: { src: string; title: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const [height, setHeight] = useState(1123);
  const [loaded, setLoaded] = useState(false);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(() =>
      setScale(Math.min(1, el.clientWidth / PAGE_WIDTH)),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={box}
      className="relative w-full"
      style={{ height: height * scale }}
    >
      {!loaded && (
        <div className="absolute inset-0 grid place-items-center">
          <Spinner className="size-6 text-ink-3" />
        </div>
      )}
      <iframe
        key={src}
        src={src}
        title={title}
        onLoad={(event) => {
          const doc = event.currentTarget.contentDocument;
          setHeight(Math.max(1123, doc?.documentElement.scrollHeight ?? 1123));
          setLoaded(true);
        }}
        className="absolute left-0 top-0 origin-top-left rounded-doc bg-white shadow-sheet"
        style={{
          width: PAGE_WIDTH,
          height,
          transform: `scale(${scale})`,
          border: 0,
        }}
      />
    </div>
  );
}
