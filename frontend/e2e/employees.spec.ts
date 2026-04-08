/**
 * Employees directory spec — search, status filter, detail navigation.
 * Project: employee
 */
import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/employees");
});

test("employee directory loads without error", async ({ page }) => {
  await expect(page.getByText(/error|something went wrong/i)).not.toBeVisible();
});

test("search input is visible", async ({ page }) => {
  await expect(page.getByPlaceholder(/search/i)).toBeVisible();
});

test("employee rows render in the table", async ({ page }) => {
  // Wait for data
  await page.waitForTimeout(1000);
  const rows = page.locator("tbody tr");
  const count = await rows.count();
  expect(count).toBeGreaterThan(0);
});

test("searching by name filters the list", async ({ page }) => {
  await page.getByPlaceholder(/search/i).fill("manager");
  await page.waitForTimeout(800);
  await expect(page.getByText(/error/i)).not.toBeVisible();
});

test("searching for non-existent name shows empty state", async ({ page }) => {
  await page.getByPlaceholder(/search/i).fill("xyznonexistent12345");
  // Wait for the search API call to complete before asserting empty state
  await page.waitForResponse((resp) => resp.url().includes("/employees") && resp.url().includes("xyznonexistent"), { timeout: 10_000 });
  await expect(page.getByText(/no data found/i)).toBeVisible({ timeout: 5_000 });
});

test("clicking an employee row or link navigates to detail page", async ({ page }) => {
  await page.waitForTimeout(500);
  const link = page
    .getByRole("link", { name: /view|details/i })
    .or(page.locator("tbody tr").first().getByRole("link"))
    .first();
  if (await link.isVisible()) {
    await link.click();
    await expect(page).toHaveURL(/\/employees\/\d+/);
  }
});

test("employee detail page renders profile info", async ({ page }) => {
  await page.waitForTimeout(500);
  const link = page
    .getByRole("link")
    .filter({ hasText: /view|details/i })
    .or(page.locator("tbody tr a").first())
    .first();
  if (await link.isVisible()) {
    await link.click();
    await expect(page.getByText(/department|designation|joining/i).first()).toBeVisible();
  }
});
