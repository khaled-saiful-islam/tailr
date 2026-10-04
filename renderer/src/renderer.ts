/**
 * Headless Chromium that prints HTML to PDF (and PNG thumbnails).
 *
 * One browser per process, one fresh context per job. All network access is
 * blocked: documents must be self-contained (inline CSS, data: URLs), which
 * also means user content can never make the renderer fetch anything.
 */
import { chromium, type Browser } from "playwright";

export type PaperFormat = "A4" | "Letter";

export interface PdfOptions {
  format?: PaperFormat;
}

export interface ShotOptions {
  width?: number;
  height?: number;
}

const MAX_CONCURRENT = Number(process.env.RENDER_CONCURRENCY ?? 4);
const TIMEOUT_MS = Number(process.env.RENDER_TIMEOUT_MS ?? 30_000);

let browser: Browser | null = null;
let active = 0;
const waiting: Array<() => void> = [];

async function getBrowser(): Promise<Browser> {
  if (browser?.isConnected()) return browser;
  browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  return browser;
}

async function acquire(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active += 1;
    return;
  }
  await new Promise<void>((resolve) => waiting.push(resolve));
  active += 1;
}

function release(): void {
  active -= 1;
  waiting.shift()?.();
}

async function withPage<T>(
  html: string,
  width: number,
  work: (page: import("playwright").Page) => Promise<T>,
  height = 1200,
): Promise<T> {
  await acquire();
  const context = await (await getBrowser()).newContext({ viewport: { width, height }, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(TIMEOUT_MS);
    await page.route("**/*", (route) =>
      route.request().url().startsWith("data:") ? route.continue() : route.abort(),
    );
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    return await work(page);
  } finally {
    await context.close();
    release();
  }
}

export async function renderPdf(html: string, options: PdfOptions = {}): Promise<Buffer> {
  return withPage(html, 900, (page) =>
    page.pdf({
      format: options.format ?? "A4",
      printBackground: true,
      preferCSSPageSize: true,
    }),
  );
}

export async function renderPng(html: string, options: ShotOptions = {}): Promise<Buffer> {
  return withPage(
    html,
    options.width ?? 900,
    (page) => page.screenshot({ type: "png", fullPage: false }),
    options.height ?? 1200,
  );
}

export async function closeBrowser(): Promise<void> {
  await browser?.close();
  browser = null;
}
