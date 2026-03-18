import { test, expect } from "@playwright/test";

test("unauthenticated user is redirected to login", async ({ page }) => {
  await page.goto("/garage");
  await expect(page).toHaveURL(/\/login/);
});

test("community feed is accessible without login", async ({ page }) => {
  await page.goto("/community");
  await expect(page).not.toHaveURL(/\/login/);
});
