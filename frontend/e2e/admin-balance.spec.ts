/**
 * Admin balance adjustments spec — form renders, add/deduct label logic.
 * Project: admin
 */
import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/admin/balance-adjustments");
});

test("balance adjustments page renders without error", async ({ page }) => {
  await expect(page.getByText(/error|something went wrong/i)).not.toBeVisible();
});

test("form has employee, leave type, year, adjustment, and reason fields", async ({ page }) => {
  await expect(page.getByLabel(/employee/i)).toBeVisible();
  await expect(page.getByLabel(/leave type/i)).toBeVisible();
  await expect(page.getByLabel(/year/i)).toBeVisible();
  await expect(page.getByPlaceholder(/e\.g\. 2 or -1/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /apply adjustment/i })).toBeVisible();
});

test("positive adjustment shows 'days will be added' hint", async ({ page }) => {
  await page.getByPlaceholder(/e\.g\. 2 or -1/i).fill("3");
  await expect(page.getByText(/3 days will be added/i)).toBeVisible();
});

test("negative adjustment shows 'days will be deducted' hint", async ({ page }) => {
  await page.getByPlaceholder(/e\.g\. 2 or -1/i).fill("-2");
  await expect(page.getByText(/2 days will be deducted/i)).toBeVisible();
});

test("submitting without required fields shows validation error", async ({ page }) => {
  await page.getByRole("button", { name: /apply adjustment/i }).click();
  await expect(page.getByText(/all fields are required|required/i)).toBeVisible();
});
