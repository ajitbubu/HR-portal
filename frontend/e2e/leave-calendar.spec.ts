/**
 * Team calendar spec — monthly grid renders, navigation works.
 * Project: employee
 */
import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/leave/calendar");
});

test("team calendar page loads without error", async ({ page }) => {
  await expect(page.getByText(/error|something went wrong/i)).not.toBeVisible();
});

test("calendar shows weekday headers", async ({ page }) => {
  await expect(page.getByText("Mon")).toBeVisible();
  await expect(page.getByText("Wed")).toBeVisible();
  await expect(page.getByText("Fri")).toBeVisible();
});

test("calendar has month/year display", async ({ page }) => {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthVisible = page.getByText(new RegExp(months.join("|"), "i")).first();
  await expect(monthVisible).toBeVisible();
});

test("calendar has navigation controls (prev/next)", async ({ page }) => {
  await expect(
    page.getByRole("button", { name: /prev|previous|‹|</i }).or(
      page.getByRole("button", { name: /next|›|>/i })
    ).first()
  ).toBeVisible();
});

test("day cells are rendered in the grid", async ({ page }) => {
  // Day numbers are rendered as <p> elements inside calendar grid cells
  const cells = page.locator("p").filter({ hasText: /^([1-9]|[12]\d|3[01])$/ });
  await expect(cells.first()).toBeVisible({ timeout: 8_000 });
  const count = await cells.count();
  expect(count).toBeGreaterThan(10);
});
