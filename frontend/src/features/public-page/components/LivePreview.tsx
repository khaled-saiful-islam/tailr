import { useLayoutEffect, useRef, useState } from "react";
import { Segmented } from "@/components/ui/choice";
import { PageView } from "@/public/PageView";
import type { Mode, PublicPage } from "@/public/types";

const DESKTOP_WIDTH = 1280;
const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 780;

type Device = "desktop" | "phone";

/** The real template, rendered as visitors see it, on a laptop or a phone. */
export function LivePreview({ page }: { page: PublicPage }) {
  const [device, setDevice] = useState<Device>("desktop");
  const [mode, setMode] = useState<Mode | "page">("page");
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Segmented
          size="sm"
          label="Preview size"
          options={[
            { value: "desktop", label: "Desktop" },
            { value: "phone", label: "Phone" },
          ]}
          value={device}
          onChange={setDevice}
        />
        <Segmented
          size="sm"
          label="Preview colours"
          options={[
            { value: "page", label: "As set" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
          value={mode}
          onChange={setMode}
        />
      </div>
      {device === "desktop" ? (
        <DesktopFrame page={page} mode={mode === "page" ? undefined : mode} />
      ) : (
        <PhoneFrame page={page} mode={mode === "page" ? undefined : mode} />
      )}
    </div>
  );
}

function DesktopFrame({ page, mode }: { page: PublicPage; mode?: Mode }) {
  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [height, setHeight] = useState(800);

  useLayoutEffect(() => {
    const outer = box.current;
    const content = inner.current;
    if (!outer || !content) return;
    const observer = new ResizeObserver(() => {
      setScale(Math.min(1, outer.clientWidth / DESKTOP_WIDTH));
      setHeight(content.scrollHeight);
    });
    observer.observe(outer);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-0 flex-1 overflow-hidden rounded-panel border border-line bg-surface shadow-sheet">
      <div
        className="flex items-center gap-1.5 border-b border-line bg-surface-2 px-3 py-2"
        aria-hidden
      >
        <span className="size-2.5 rounded-full bg-line-strong" />
        <span className="size-2.5 rounded-full bg-line-strong" />
        <span className="size-2.5 rounded-full bg-line-strong" />
        <span className="ml-3 min-w-0 flex-1 rounded-full bg-surface px-3 py-0.5 text-[0.75rem] text-ink-3 [overflow-wrap:anywhere]">
          {page.url.replace(/^https?:\/\//, "")}
        </span>
      </div>
      <div
        ref={box}
        className="h-[min(72vh,52rem)] overflow-y-auto overflow-x-hidden"
      >
        <div style={{ height: height * scale }}>
          <div
            ref={inner}
            style={{
              width: DESKTOP_WIDTH,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <PageView page={page} preview mode={mode} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PhoneFrame({ page, mode }: { page: PublicPage; mode?: Mode }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const outer = box.current;
    if (!outer) return;
    const observer = new ResizeObserver(() =>
      setScale(Math.min(1, (outer.clientWidth - 8) / (PHONE_WIDTH + 24))),
    );
    observer.observe(outer);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={box} className="flex min-h-0 flex-1 justify-center">
      <div
        style={{
          width: PHONE_WIDTH + 24,
          height: (PHONE_HEIGHT + 24) * scale,
        }}
      >
        <div
          className="rounded-[44px] border border-line-strong bg-ink p-3 shadow-sheet"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: PHONE_WIDTH + 24,
          }}
        >
          <div
            className="overflow-y-auto overflow-x-hidden rounded-[34px] bg-surface"
            style={{ width: PHONE_WIDTH, height: PHONE_HEIGHT }}
          >
            <PageView page={page} preview mode={mode} />
          </div>
        </div>
      </div>
    </div>
  );
}
