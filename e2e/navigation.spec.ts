import { test, expect } from "@playwright/test";

// NOTE: These tests assume an authenticated session. In CI, set up a
// storageState or auth fixture before running. Currently validates nav
// structure on unauthenticated-accessible pages where possible.

test.describe("Bottom navigation", () => {
  test("bottom nav is visible on mobile viewport at /", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.getByRole("tablist")).toBeVisible();
  });

  test("tablist has 5 tabs", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const tabs = page.getByRole("tab");
    await expect(tabs).toHaveCount(5);
  });

  test("tapping Garage tab navigates to /garage", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("tab", { name: "Garage" }).click();
    await expect(page).toHaveURL(/\/garage/);
  });

  test("bottom nav is hidden at desktop viewport (lg:hidden)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    const nav = page.getByRole("tablist");
    // lg:hidden means display:none — not visible
    await expect(nav).not.toBeVisible();
  });
});
