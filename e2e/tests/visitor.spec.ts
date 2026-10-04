import { expect, test } from "@playwright/test";
import { accessible, fitsTheScreen } from "./helpers";

test("sign-in page", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  await fitsTheScreen(page);
  await accessible(page);
});

test("a public portfolio and one of its case studies", async ({ page }) => {
  await page.goto("/p/demo");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page).toHaveTitle(/Tailr/);
  await fitsTheScreen(page);
  await accessible(page);

  const study = page.locator('a[href^="/p/demo/work/"]').first();
  await study.scrollIntoViewIfNeeded();
  await study.click();
  await expect(page).toHaveURL(/\/p\/demo\/work\//);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await fitsTheScreen(page);
});

test("a shared CV", async ({ page }) => {
  await page.goto("/cv/demo");
  await expect(page.getByRole("link", { name: /download/i }).first()).toBeVisible();
  await fitsTheScreen(page);
});

test("addresses that don't exist say so", async ({ page }) => {
  const response = await page.goto("/p/nobody-here-at-all");
  expect(response?.status()).toBe(404);
});
