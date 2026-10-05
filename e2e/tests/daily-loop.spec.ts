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
  await expect(page.getByRole("heading", { name: "Needs you now" })).toBeVisible();
  await fitsTheScreen(page);
  await accessible(page);

  // Each application opens on its own page, showing only what matters at its stage.
  await page.locator('[aria-roledescription="application card"], ol a').first().click();
  await expect(page).toHaveURL(/\/applications\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("group", { name: "Stage" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Next: prepare your application$/ })).toBeVisible();
  await fitsTheScreen(page);
  await accessible(page);
  await page.getByRole("link", { name: "My applications" }).first().click();
  await expect(page).toHaveURL(/\/applications$/);
});

test("a prepared application and its four steps", async ({ page }) => {
  await page.goto("/jobs");
  await page.locator('a[href^="/jobs/"]').first().click();
  const open = page.getByRole("link", { name: /open my application/i });
  await expect(
    page.getByRole("button", { name: /prepare my application/i }).or(open).first(),
  ).toBeVisible();
  if (await open.count()) {
    await open.first().click();
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText(
      "Your application",
    );
    await expect(page.getByRole("tab", { name: "CV" })).toBeVisible();
    await expect(page.getByText(/four steps to apply/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: "How it's written" })).toBeVisible();
    await page.getByText("Warm", { exact: true }).click();
    await expect(page.getByRole("button", { name: "Rewrite in a warm tone" })).toBeVisible();
    await fitsTheScreen(page);
    await accessible(page);
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
