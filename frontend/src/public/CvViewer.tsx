/**
 * /cv/<slug>: a shared CV. The document itself (exactly what the PDF prints), scaled
 * to fit the screen, under a bar with Download and Share.
 */
import { Download } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { MadeWithTailr, ShareAction } from "./parts/actions";

export interface SharedCv {
  slug: string;
  url: string;
  name: string;
  headline: string | null;
  document_url: string;
  pdf_url: string;
  paper: "A4" | "Letter";
}

const WIDTH = { A4: 794, Letter: 816 } as const;
const HEIGHT = { A4: 1123, Letter: 1056 } as const;

export function CvViewer({ cv }: { cv: SharedCv }) {
  const box = useRef<HTMLDivElement>(null);
  const width = WIDTH[cv.paper];
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number>(HEIGHT[cv.paper]);

  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      setScale(Math.min(1, element.clientWidth / width)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [width]);

  useLayoutEffect(() => {
    document.documentElement.style.background = "#e6e8ec";
  }, []);

  const button =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-[0.9375rem] font-semibold transition-colors";

  return (
    <div
      data-template="broadsheet"
      data-mode="light"
      className="min-h-dvh bg-[#e6e8ec] font-pg-mono text-pg-ink"
    >
      <header className="sticky top-0 z-20 border-b border-black/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[60rem] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <div className="min-w-0">
            <h1 className="font-pg-display text-[1.25rem] font-semibold leading-tight">
              {cv.name}
            </h1>
            {cv.headline && (
              <p className="text-[0.875rem] text-pg-ink-2">{cv.headline}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={cv.pdf_url}
              download
              className={`${button} bg-pg-ink text-white hover:bg-black`}
            >
              <Download className="size-4" aria-hidden />
              Download PDF
            </a>
            <ShareAction
              page={cv}
              className={`${button} border border-black/15 bg-white hover:border-black/40`}
              menuClassName="right-0 left-auto rounded-xl"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[60rem] px-3 py-6 sm:px-6 sm:py-10">
        <div
          ref={box}
          className="mx-auto"
          style={{ maxWidth: width, height: height * scale }}
        >
          <iframe
            src={cv.document_url}
            title={`${cv.name}'s CV`}
            onLoad={(event) => {
              const doc = event.currentTarget.contentDocument;
              if (doc)
                setHeight(
                  Math.max(HEIGHT[cv.paper], doc.documentElement.scrollHeight),
                );
            }}
            className="origin-top-left bg-white shadow-[0_2px_4px_rgb(0_0_0/0.06),0_24px_60px_-24px_rgb(0_0_0/0.35)]"
            style={{ width, height, transform: `scale(${scale})`, border: 0 }}
          />
        </div>
        <p className="mt-8 text-center text-[0.8125rem] text-pg-ink-3">
          <MadeWithTailr className="hover:text-pg-ink" />
        </p>
      </main>
    </div>
  );
}
