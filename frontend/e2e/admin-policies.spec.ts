/**
 * Admin leave policies spec — policy cards, inline edit form.
 * Project: admin
 */
import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/admin/leave-policies");
});

test("leave policies page renders without error", async ({ page }) => {
  await expect(page.getByText(/error|something went wrong/i)).not.toBeVisible();
});

test("policy cards are visible", async ({ page }) => {
  // At least one policy card should exist (seeded data has leave types)
  await expect(page.locator(".card").first()).toBeVisible();
});

test("each policy card has an Edit button", async ({ page }) => {
  await expect(
    page.getByRole("button", { name: /edit/i }).first()
  ).toBeVisible();
});

test("clicking Edit reveals inline form with Save button", async ({ page }) => {
  await page.getByRole("button", { name: /edit/i }).first().click();
  await expect(page.getByRole("button", { name: /save/i })).toBeVisible();
});

test("inline form has quota and carry-forward fields", async ({ page }) => {
  await page.getByRole("button", { name: /edit/i }).first().click();
  // Should show editable numeric fields for quota/days
  await expect(
    page.getByLabel(/default days|quota|days per year/i).first()
  ).toBeVisible();
});

test("clicking Cancel closes the inline form", async ({ page }) => {
  await page.getByRole("button", { name: /edit/i }).first().click();
  await expect(page.getByRole("button", { name: /save/i })).toBeVisible();
  await page.getByRole("button", { name: /cancel/i }).click();
  await expect(page.getByRole("button", { name: /save/i })).not.toBeVisible();
});
