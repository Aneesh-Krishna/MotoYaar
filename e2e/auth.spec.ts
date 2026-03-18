import { test, expect } from "@playwright/test";

test("protected route redirects to login with callbackUrl", async ({ page }) => {
  await page.goto("/garage");
  await expect(page).toHaveURL(/\/login\?callbackUrl/);
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

// Story 2.3 — Walkthrough stubs
// TODO: implement with authenticated session fixture once test auth helpers exist
test.skip("walkthrough shows 5 cards with Next navigation", async ({ page }) => {
  // Given: authenticated user navigates to /onboarding/walkthrough
  // When: they click Next through all cards
  // Then: they see 5 cards (Dashboard, Garage, Trips, Community, Profile)
  await page.goto("/onboarding/walkthrough");
  for (let i = 0; i < 4; i++) {
    await page.click("text=Next");
  }
  await expect(page.locator("text=Get started")).toBeVisible();
});

test.skip("skip sets walkthroughSeen and redirects to dashboard", async ({ page }) => {
  // Given: authenticated user is on /onboarding/walkthrough
  // When: they click Skip
  // Then: PATCH /api/users/me is called with walkthroughSeen: true and they are on /
  await page.goto("/onboarding/walkthrough");
  await page.click("text=Skip");
  await expect(page).toHaveURL("/");
});
