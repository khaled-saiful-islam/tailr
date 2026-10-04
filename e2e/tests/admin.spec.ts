import { expect, test } from "@playwright/test";
import { accessible, ADMIN, DEMO, fitsTheScreen, signIn } from "./helpers";

test("the admin panel lists users and their AI use", async ({ page }) => {
  await signIn(page, ADMIN.username, ADMIN.password);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(DEMO.email).first()).toBeVisible();
  await fitsTheScreen(page);
  await accessible(page);
});

test("people who aren't admins are kept out", async ({ page }) => {
  await signIn(page, DEMO.email, DEMO.password);
  await page.goto("/admin");
  await expect(page.getByText(/for administrators/i)).toBeVisible();
});
