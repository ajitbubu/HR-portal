/**
 * Admin employees spec — list, search, deactivate, import.
 * Project: admin
 */
import { test, expect } from "@playwright/test";

test("admin employees page renders employee table", async ({ page }) => {
  await page.goto("/admin/employees");
  await expect(page.getByPlaceholder(/search/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /add employee/i })).toBeVisible();
});

test("status filter dropdown is present", async ({ page }) => {
  await page.goto("/admin/employees");
  await expect(page.getByTitle(/filter by status/i)).toBeVisible();
});

test("search filters the employee list", async ({ page }) => {
  await page.goto("/admin/employees");
  await page.getByPlaceholder(/search/i).fill("datasafeguard");
  await expect(page.getByText(/error/i)).not.toBeVisible();
  // At least one employee should appear (seeded data uses datasafeguard.us emails)
  const rows = page.locator("tbody tr");
  const count = await rows.count();
  expect(count).toBeGreaterThan(0);
});

test("bulk import link navigates to import page", async ({ page }) => {
  await page.goto("/admin/employees");
  await page.getByRole("link", { name: /bulk import/i }).click();
  await expect(page).toHaveURL("/admin/employees/import");
});

test("import page renders CSV drop zone", async ({ page }) => {
  await page.goto("/admin/employees/import");
  await expect(page.getByText(/drop your csv/i)).toBeVisible();
});

test("import page shows required column hints", async ({ page }) => {
  await page.goto("/admin/employees/import");
  await expect(page.getByText(/first_name/i)).toBeVisible();
  await expect(page.getByText(/employee_id/i)).toBeVisible();
});

test("add employee link goes to create form", async ({ page }) => {
  await page.goto("/admin/employees");
  await page.getByRole("link", { name: /add employee/i }).click();
  await expect(page).toHaveURL(/\/employees\/new/);
});
