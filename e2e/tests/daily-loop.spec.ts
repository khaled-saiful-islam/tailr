import { expect, test } from "@playwright/test";
import { accessible, DEMO, fitsTheScreen, signIn } from "./helpers";

test.beforeEach(async ({ page }) => {
  await signIn(page, DEMO.email, DEMO.password);
});

test("today: the brief, momentum and the market", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    /Good (morning|afternoon|evening)|Working late/,
  );
  await expect(page.getByText(/applications this week/i).first()).toBeVisible();
  await fitsTheScreen(page);
  await accessible(page);
});

test("a job: its fit, then the tracker", async ({ page }) => {
  await page.goto("/jobs");
  await page.locator('a[href^="/jobs/"]').first().click();
  await expect(page.getByRole("heading", { name: "Your fit" })).toBeVisible();
  await fitsTheScreen(page);

  await page.goto("/tracker");
  await expect(
    page.getByRole("heading", { name: "Your applications", exact: true }),
  ).toBeVisible();
  await fitsTheScreen(page);
  await accessible(page);
  await page.locator('[aria-roledescription="application card"], ol button').first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Where it stands")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("a ready application kit", async ({ page }) => {
  await page.goto("/tracker");
  await page.locator('[aria-roledescription="application card"], ol button').first().click();
  const kit = page.getByRole("link", { name: "Your kit" });
  if (await kit.count()) {
    await kit.click();
    await expect(page.getByRole("tab", { name: "Resume" })).toBeVisible();
    await fitsTheScreen(page);
  }
});

test("CV Studio, the portfolio editor and settings", async ({ page }) => {
  for (const path of ["/profile", "/profile/cv", "/profile/portfolio", "/radar", "/settings"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await fitsTheScreen(page);
  }
  await accessible(page); // settings
});
