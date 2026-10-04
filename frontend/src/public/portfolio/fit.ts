/**
 * Big type never splits a word. Any element marked `data-fit` keeps its designed
 * size unless its longest word is wider than the line; then it shrinks just enough
 * for that word to fit ("recommendations" on a phone, a long surname in a sidebar).
 */
import { useLayoutEffect, type RefObject } from "react";

const COPIED = [
  "fontFamily",
  "fontWeight",
  "fontStyle",
  "fontStretch",
  "fontSize",
  "fontFeatureSettings",
  "fontVariationSettings",
  "letterSpacing",
  "textTransform",
] as const;

/** Measures words off-page, so the portfolio's own markup never changes. */
function widestWord(el: HTMLElement, probe: HTMLSpanElement): number {
  const words = (el.textContent ?? "").split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  const style = getComputedStyle(el);
  for (const key of COPIED) probe.style[key] = style[key];
  let widest = 0;
  for (const word of words) {
    probe.textContent = word;
    widest = Math.max(widest, probe.getBoundingClientRect().width);
  }
  return widest;
}

function fit(el: HTMLElement, probe: HTMLSpanElement): void {
  el.style.fontSize = "";
  const style = getComputedStyle(el);
  const room =
    el.clientWidth -
    parseFloat(style.paddingLeft) -
    parseFloat(style.paddingRight);
  const widest = widestWord(el, probe);
  if (room <= 0 || widest <= room) return;
  const size = parseFloat(style.fontSize);
  el.style.fontSize = `${Math.floor(((size * room) / widest) * 0.98)}px`;
}

/** Keeps every `[data-fit]` inside `root` fitted as text, routes and widths change. */
export function useFitWords(root: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;
    const probe = document.createElement("span");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText =
      "position:fixed;left:-9999px;top:0;visibility:hidden;white-space:nowrap;pointer-events:none";
    document.body.append(probe);

    let frame = 0;
    const run = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        node
          .querySelectorAll<HTMLElement>("[data-fit]")
          .forEach((el) => fit(el, probe)),
      );
    };
    run();

    let width = node.clientWidth;
    const resize = new ResizeObserver(() => {
      if (node.clientWidth === width) return;
      width = node.clientWidth;
      run();
    });
    resize.observe(node);
    // Route changes swap nodes; edits in the preview change text. Counters ticking
    // elsewhere are ignored, and our own font sizes are attributes, not watched.
    const changes = new MutationObserver((records) => {
      const relevant = records.some(
        (record) =>
          record.type === "childList" ||
          record.target.parentElement?.closest("[data-fit]"),
      );
      if (relevant) run();
    });
    changes.observe(node, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    void document.fonts?.ready.then(run);

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      changes.disconnect();
      probe.remove();
    };
  }, [root]);
}
