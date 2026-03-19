import { test, expect } from "@playwright/test";

// Story 3.3 — Add Vehicle (6-Step Wizard)
// TODO: remove test.skip and provide authenticated storageState fixture once
// auth helpers are configured (Story 3.1 follow-on).

test.skip("user can add a vehicle through the 6-step wizard", async ({ page }) => {
  // Given: authenticated user navigates to the new vehicle page
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/garage/new");

  // Step 1 — Name & Type
  await expect(page.getByText("Step 1 of 6")).toBeVisible();
  await page.fill('[placeholder="e.g. Royal Enfield Classic 350"]', "My Test Bike");
  await page.selectOption("select", "2-wheeler");
  await page.getByRole("button", { name: "Next" }).click();

  // Step 2 — Details
  await expect(page.getByText("Step 2 of 6")).toBeVisible();
  await page.fill('[placeholder="e.g. MH12AB1234"]', "MH12AB9999");
  await page.getByRole("button", { name: "Next" }).click();

  // Step 3 — Ownership (skip)
  await expect(page.getByText("Step 3 of 6")).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();

  // Step 4 — Photo (skip)
  await expect(page.getByText("Step 4 of 6")).toBeVisible();
  await page.getByRole("button", { name: "Skip" }).click();

  // Step 5 — Documents (skip)
  await expect(page.getByText("Step 5 of 6")).toBeVisible();
  await page.getByRole("button", { name: "Skip for now" }).click();

  // Step 6 — Review
  await expect(page.getByText("Step 6 of 6")).toBeVisible();
  await expect(page.getByText("My Test Bike")).toBeVisible();
  await expect(page.getByText("MH12AB9999")).toBeVisible();
  await page.getByRole("button", { name: "Save Vehicle" }).click();

  // On success: redirected to /garage/[id]
  await expect(page).toHaveURL(/\/garage\/.+/);
});

test.skip("duplicate registration number shows 409 error on review step", async ({ page }) => {
  // Given: authenticated user who already has a vehicle with MH12AB1234
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/garage/new");

  // Navigate to step 6 with a duplicate reg number
  await page.fill('[placeholder="e.g. Royal Enfield Classic 350"]', "Duplicate Bike");
  await page.selectOption("select", "4-wheeler");
  await page.getByRole("button", { name: "Next" }).click();

  await expect(page.getByText("Step 2 of 6")).toBeVisible();
  await page.fill('[placeholder="e.g. MH12AB1234"]', "MH12AB1234");
  await page.getByRole("button", { name: "Next" }).click();

  await page.getByRole("button", { name: "Next" }).click(); // step 3
  await page.getByRole("button", { name: "Skip" }).click();  // step 4
  await page.getByRole("button", { name: "Skip for now" }).click(); // step 5

  await page.getByRole("button", { name: "Save Vehicle" }).click();

  await expect(
    page.getByText("You already have a vehicle with this registration number")
  ).toBeVisible();
});

test.skip("back button returns to previous step", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/garage/new");

  // Advance to step 2
  await page.fill('[placeholder="e.g. Royal Enfield Classic 350"]', "My Bike");
  await page.selectOption("select", "2-wheeler");
  await page.getByRole("button", { name: "Next" }).click();

  await expect(page.getByText("Step 2 of 6")).toBeVisible();

  // Go back
  await page.getByRole("button", { name: "Go back" }).click();
  await expect(page.getByText("Step 1 of 6")).toBeVisible();
});

test.skip("close button on step 1 returns to /garage", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/garage/new");

  await expect(page.getByText("Step 1 of 6")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();

  await expect(page).toHaveURL(/\/garage$/);
});
