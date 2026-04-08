/**
 * Comp-off spec — list, apply form validation, approvals page.
 * Project: employee (list + apply), manager (approvals step 1), hr (approvals step 2)
 */
import { test, expect } from "@playwright/test";

test("comp-off list page loads with Apply link", async ({ page }) => {
  await page.goto("/leave/comp-off");
  await expect(page.getByText(/error|something went wrong/i)).not.toBeVisible();
  await expect(
    page.getByRole("link", { name: /apply/i }).first()
  ).toBeVisible();
});

test("comp-off apply page renders form fields", async ({ page }) => {
  await page.goto("/leave/comp-off/apply");
  await expect(page.getByLabel(/work date/i)).toBeVisible();
  await expect(page.getByLabel(/hours worked/i)).toBeVisible();
  await expect(page.getByLabel(/reason/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /submit/i })).toBeVisible();
});

test("comp-off apply rejects today as work date", async ({ page }) => {
  await page.goto("/leave/comp-off/apply");
  const today = new Date().toISOString().split("T")[0];
  await page.getByLabel(/work date/i).fill(today);
  await page.getByLabel(/reason/i).fill("Worked on a project");
  await page.getByRole("button", { name: /submit/i }).click();
  await expect(page.getByText(/work date must be in the past/i)).toBeVisible();
});

test("comp-off apply shows full/half day credit selector", async ({ page }) => {
  await page.goto("/leave/comp-off/apply");
  await expect(page.getByText(/full day|half day/i).first()).toBeVisible();
});

test("comp-off approvals page loads for manager/hr", async ({ page }) => {
  await page.goto("/leave/comp-off/approvals");
  await expect(page.getByText(/error|something went wrong/i)).not.toBeVisible();
  await expect(page.getByRole("heading", { name: /comp.?off approvals?/i })).toBeVisible();
});
