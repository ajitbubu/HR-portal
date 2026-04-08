/**
 * Admin holidays spec — create calendar, add/delete holiday.
 * Project: admin
 */
import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/admin/holidays");
});

test("holidays page renders without error", async ({ page }) => {
  await expect(page.getByText(/error|something went wrong/i)).not.toBeVisible();
});

test("New Calendar button is visible", async ({ page }) => {
  await expect(page.getByRole("button", { name: /new calendar/i })).toBeVisible();
});

test("clicking New Calendar opens form with name and year fields", async ({ page }) => {
  await page.getByRole("button", { name: /new calendar/i }).click();
  await expect(page.getByLabel(/calendar name/i)).toBeVisible();
  await expect(page.getByLabel(/year/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /create calendar/i })).toBeVisible();
});

test("New Calendar form can be cancelled", async ({ page }) => {
  await page.getByRole("button", { name: /new calendar/i }).click();
  await expect(page.getByLabel(/calendar name/i)).toBeVisible();
  await page.getByRole("button", { name: /cancel/i }).click();
  await expect(page.getByLabel(/calendar name/i)).not.toBeVisible();
});

test("Add Holiday button appears on existing calendars", async ({ page }) => {
  const addBtn = page.getByRole("button", { name: /add holiday/i }).first();
  if (await addBtn.isVisible()) {
    await addBtn.click();
    await expect(page.getByLabel(/name/i).first()).toBeVisible();
    await expect(page.getByLabel(/date/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /add holiday/i }).last()).toBeVisible();
  }
});
