import { test, expect } from "@playwright/test";

test("unauthenticated user is redirected to login", async ({ page }) => {
  await page.goto("/garage");
  await expect(page).toHaveURL(/\/login/);
});

test("community feed is accessible without login", async ({ page }) => {
  await page.goto("/community");
  await expect(page).not.toHaveURL(/\/login/);
});

// Story 2.2 — Onboarding stubs
// TODO: implement with authenticated session fixture once test auth helpers exist
test.skip("new user with empty username is redirected to onboarding after login", async ({ page }) => {
  // Given: a user who has completed Google OAuth but has no username set
  // When: they navigate to any app route (e.g. /garage)
  // Then: they are redirected to /onboarding
  await page.goto("/garage");
  await expect(page).toHaveURL(/\/onboarding/);
});

test.skip("onboarding form shows inline error when username is already taken", async ({ page }) => {
  // Given: the user is on /onboarding
  // When: they type a username that already exists in the DB
  // Then: the inline ✗ indicator and "Username taken" message appear after debounce
  await page.goto("/onboarding");
  await page.fill('[placeholder="your_username"]', "takenusername");
  await page.waitForTimeout(500); // allow debounce
  await expect(page.locator("text=Username taken")).toBeVisible();
});
