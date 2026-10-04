import { expect, test } from "@playwright/test";
import { accessible, DEMO, fitsTheScreen, signIn } from "./helpers";

test.beforeEach(async ({ page }) => {
  await signIn(page, DEMO.email, DEMO.password);
});

test("home: today's jobs, this week and what employers want", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    /Good (morning|afternoon|evening)|Working late/,
  );
  await expect(page.getByRole("heading", { name: "This week" })).toBeVisible();
  await expect(page.getByRole("link", { name: /see all jobs/i }).first()).toBeVisible();
  await fitsTheScreen(page);
  await accessible(page);
});

test("a job: how well you match, then My applications", async ({ page }) => {
  await page.goto("/jobs");
  await page.locator('a[href^="/jobs/"]').first().click();
  await expect(page.getByRole("heading", { name: "How well you match" })).toBeVisible();
  await expect(page
      .getByRole("button", { name: /prepare my application/i })
      .or(page.getByRole("link", { name: /open my application/i }))
      .first()).toBeVisible();
  await fitsTheScreen(page);

  await page.goto("/applications");
  await expect(
    page.getByRole("heading", { name: "My applications", exact: true }),
  ).toBeVisible();
  await fitsTheScreen(page);
  await accessible(page);
  await page.locator('[aria-roledescription="application card"], ol button').first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Where it stands")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("a prepared application and its four steps", async ({ page }) => {
  await page.goto("/applications");
  await page.locator('[aria-roledescription="application card"], ol button').first().click();
  const kit = page.getByRole("link", { name: "Your application" });
  if (await kit.count()) {
    await kit.click();
    await expect(page.getByRole("tab", { name: "CV" })).toBeVisible();
    await expect(page.getByText(/four steps to apply/i)).toBeVisible();
    await fitsTheScreen(page);
  }
});

test("my profile, CV, website, job preferences and account settings", async ({ page }) => {
  for (const path of ["/profile", "/profile/cv", "/profile/website", "/preferences", "/settings"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await fitsTheScreen(page);
  }
  await accessible(page); // settings
});

test("job preferences never search on their own, only on Check now", async ({ page }) => {
  const searches: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/radar/preview")) {
      searches.push(request.url());
    }
  });
  await page.goto("/preferences");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /a quick look/i })).toBeVisible();
  await page.waitForTimeout(2500); // the old page started a search a moment after opening
  expect(searches).toEqual([]);
});
