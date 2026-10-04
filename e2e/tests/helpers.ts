import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export const DEMO = {
  email: process.env.DEMO_EMAIL ?? "demo@tailr.app",
  password: process.env.DEMO_PASSWORD ?? "Tailr-demo-2026",
};
export const ADMIN = {
  username: process.env.ADMIN_USERNAME ?? "admin",
  password: process.env.ADMIN_PASSWORD ?? "admin",
};

export async function signIn(page: Page, identifier: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel(/email or username/i).fill(identifier);
  await page.getByLabel(/^password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).not.toHaveURL(/sign-in/);
}

/** No page may scroll sideways, at any width. */
export async function fitsTheScreen(page: Page) {
  const extra = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(extra, "the page scrolls sideways").toBeLessThanOrEqual(0);
}

/** WCAG 2.2 AA: no serious or critical problems. */
export async function accessible(page: Page) {
  // Let entrances finish: half-faded text would read as low contrast.
  await page.waitForTimeout(1200);
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity) // pulses never end
        .map((a) => a.finished.catch(() => null)),
    ),
  );
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const problems = results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.help} (${v.nodes.length}) ${v.nodes[0]?.target.join(" ")}`);
  expect(problems, problems.join("\n")).toEqual([]);
}
