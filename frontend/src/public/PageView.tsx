import { MotionConfig } from "motion/react";
import {
  lazy,
  Suspense,
  useEffect,
  useState,
  useSyncExternalStore,
  type ComponentType,
} from "react";
import { PortfolioSite, type PortfolioKit } from "./portfolio/PortfolioSite";
import type { Mode, PublicPage, TemplateKey, TemplateProps } from "./types";

function site(load: () => Promise<PortfolioKit>): ComponentType<TemplateProps> {
  return lazy(() =>
    load().then((kit) => ({
      default: (props: TemplateProps) => <PortfolioSite kit={kit} {...props} />,
    })),
  );
}

const TEMPLATES: Record<TemplateKey, ComponentType<TemplateProps>> = {
  blueprint: site(() =>
    import("./templates/blueprint").then((m) => m.blueprint),
  ),
  broadsheet: site(() =>
    import("./templates/broadsheet").then((m) => m.broadsheet),
  ),
  salon: site(() => import("./templates/salon").then((m) => m.salon)),
  poster: site(() => import("./templates/poster").then((m) => m.poster)),
  stamp: site(() => import("./templates/stamp").then((m) => m.stamp)),
};

const darkQuery = "(prefers-color-scheme: dark)";
function subscribe(onChange: () => void): () => void {
  const query = matchMedia(darkQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
function systemPrefersDark(): boolean {
  return matchMedia(darkQuery).matches;
}

/**
 * One public page in its template. On the real page it also themes the document;
 * in the owner's preview it stays inside its frame (`preview`).
 */
export function PageView({
  page,
  preview = false,
  mode: forced,
  className,
}: {
  page: PublicPage;
  preview?: boolean;
  /** Force a mode (the preview's light/dark switch); otherwise the owner's choice or the device's. */
  mode?: Mode;
  className?: string;
}) {
  const systemDark = useSyncExternalStore(
    subscribe,
    systemPrefersDark,
    () => false,
  );
  const [chosen, setChosen] = useState<Mode | null>(null);
  const preferred: Mode =
    page.appearance === "auto"
      ? systemDark
        ? "dark"
        : "light"
      : page.appearance;
  const mode = forced ?? chosen ?? preferred;
  const Template = TEMPLATES[page.template] ?? TEMPLATES.blueprint;

  useEffect(() => {
    if (preview) return;
    const root = document.documentElement;
    root.dataset.template = page.template;
    root.dataset.mode = mode;
    root.style.colorScheme = mode;
  }, [preview, page.template, mode]);

  return (
    <MotionConfig reducedMotion="user">
      <div
        data-template={page.template}
        data-mode={mode}
        className={`@container relative min-h-full ${className ?? ""}`}
      >
        <Suspense fallback={<div className="min-h-dvh" />}>
          <Template
            page={page}
            mode={mode}
            preview={preview}
            onToggleMode={() => setChosen(mode === "dark" ? "light" : "dark")}
          />
        </Suspense>
      </div>
    </MotionConfig>
  );
}
