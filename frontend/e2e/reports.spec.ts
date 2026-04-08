/**
 * Reports spec — all 9 tabs render without errors, CSV export button exists.
 * Project: hr
 */
import { test, expect } from "@playwright/test";

const TABS = [
  "Attendance",
  "Headcount",
  "Leave Utilization",
  "PTO Balances",
  "Approval Aging",
  "Absenteeism",
  "Team Availability",
  "Comp-Off",
  "Holidays",
] as const;

test.beforeEach(async ({ page }) => {
  await page.goto("/reports");
});

test("reports page loads without error", async ({ page }) => {
  await expect(page.getByText(/something went wrong|error/i)).not.toBeVisible();
});

test("all tab buttons are visible", async ({ page }) => {
  for (const tab of TABS) {
    await expect(
      page.getByRole("button", { name: tab })
    ).toBeVisible();
  }
});

for (const tab of TABS) {
  test(`${tab} tab — renders content without crash`, async ({ page }) => {
    await page.getByRole("button", { name: tab }).click();
    // Wait briefly for data to load
    await page.waitForTimeout(1000);
    // No unhandled error state
    await expect(page.getByText(/something went wrong|unhandled error/i)).not.toBeVisible();
    // The tab button is still selected / visible
    await expect(page.getByRole("button", { name: tab })).toBeVisible();
  });
}

test("Attendance tab has Export CSV button", async ({ page }) => {
  await page.getByRole("button", { name: "Attendance" }).click();
  await expect(
    page.getByRole("button", { name: /export csv/i })
  ).toBeVisible();
});

test("PTO Balances tab has Export CSV button", async ({ page }) => {
  await page.getByRole("button", { name: "PTO Balances" }).click();
  await expect(
    page.getByRole("button", { name: /export csv/i })
  ).toBeVisible();
});
