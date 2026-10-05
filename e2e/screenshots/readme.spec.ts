import { test, type Browser, type Page } from "@playwright/test";

/** Where the pictures go: docs/screenshots (mounted at /screenshots by `make screenshots`). */
const OUT = process.env.SCREENSHOTS_DIR ?? "../docs/screenshots";
const DEMO = { username: "demo", password: process.env.DEMO_PASSWORD ?? "Tailr-demo-2026" };

interface Look {
  width: number;
  height: number;
  scheme: "light" | "dark";
  scale?: number;
}

async function signedIn(browser: Browser, look: Look): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width: look.width, height: look.height },
    colorScheme: look.scheme,
    deviceScaleFactor: look.scale ?? 1,
    // The demo lives in Kuala Lumpur; the container's clock is UTC.
    timezoneId: "Asia/Kuala_Lumpur",
    locale: "en-MY",
  });
  const page = await context.newPage();
  await page.goto("/sign-in");
  await page.getByLabel(/email or username/i).fill(DEMO.username);
  await page.getByLabel(/^password/i).fill(DEMO.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("sign-in"));
  return page;
}

async function api<T>(page: Page, path: string, body?: object): Promise<T> {
  return page.evaluate(
    async ([url, data]) => {
      const init = data
        ? { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(data) }
        : undefined;
      return (await fetch(url, init)).json();
    },
    [path, body] as const,
  ) as Promise<T>;
}

async function shot(page: Page, path: string, name: string, before?: (page: Page) => Promise<void>) {
  await page.goto(path);
  await page.waitForTimeout(2600); // entrances finish
  if (before) await before(page);
  await page.screenshot({ path: `${OUT}/${name}.jpg`, type: "jpeg", quality: 82 });
}

const palette = (page: Page, value: string) => api(page, "/api/v1/auth/me", { palette: value });

test("README screenshots", async ({ browser }) => {
  // Desktop, light, the Classic palette.
  const page = await signedIn(browser, { width: 1440, height: 900, scheme: "light" });
  await api(page, "/api/v1/auth/me", { theme: "system", palette: "tape" });
  const kits = await api<{ id: string; job_title?: string }[]>(page, "/api/v1/kits");
  const kitId = kits.find((kit) => JSON.stringify(kit).includes("Teratai"))?.id ?? kits[0]!.id;
  const kit = await api<{ match_id: string }>(page, `/api/v1/kits/${kitId}`);
  const board = await api<{ items: { id: string; stage: string }[] }>(page, "/api/v1/applications");
  const interviewing = board.items.find((item) => item.stage === "interview")?.id;

  await shot(page, "/", "home");
  await shot(page, "/jobs", "jobs");
  await shot(page, `/jobs/${kit.match_id}`, "job");
  await shot(page, `/apply/${kitId}`, "application");
  await shot(page, `/apply/${kitId}?tab=interview`, "interview", async (p) => {
    await p.evaluate(() => document.getElementById("application-tabs")?.scrollIntoView());
    await p.waitForTimeout(1500);
  });
  await shot(page, "/applications", "applications");
  if (interviewing) await shot(page, `/applications/${interviewing}`, "application-page");
  await shot(page, "/preferences", "preferences");
  await shot(page, "/profile", "profile");
  await shot(page, "/profile/cv", "cv");
  await shot(page, "/profile/website", "website");
  await shot(page, "/p/demo", "portfolio");
  await shot(page, "/", "appearance", async (p) => {
    await p.getByRole("button", { name: /appearance/i }).first().click();
    await p.waitForTimeout(800);
  });
  await page.context().close();

  // Desktop, dark: Classic, then two other palettes; back to Classic at the end.
  const dark = await signedIn(browser, { width: 1440, height: 900, scheme: "dark" });
  await shot(dark, "/jobs", "dark-jobs");
  await palette(dark, "orchid");
  await shot(dark, "/applications", "dark-orchid-applications");
  await palette(dark, "lagoon");
  await shot(dark, "/", "dark-lagoon-home");
  await palette(dark, "tape");
  await dark.context().close();

  // A phone, dark.
  const phone = await signedIn(browser, { width: 390, height: 844, scheme: "dark", scale: 2 });
  await shot(phone, "/", "phone-home");
  await shot(phone, `/jobs/${kit.match_id}`, "phone-job");
  await shot(phone, "/applications", "phone-applications");
  await phone.context().close();
});
