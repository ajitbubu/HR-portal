/**
 * Leave apply spec — form fields, balance check, half-day, medical cert gate.
 * Project: employee
 */
import { test, expect } from "@playwright/test";

// Helper: next-month date strings to avoid "past date" rejections
function nextMonth(day: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, day);
  return d.toISOString().split("T")[0];
}

test.beforeEach(async ({ page }) => {
  await page.goto("/leave/apply");
});

test("apply form renders all required fields", async ({ page }) => {
  await expect(page.getByLabel(/leave type/i)).toBeVisible();
  await expect(page.getByLabel(/start date/i)).toBeVisible();
  await expect(page.getByLabel(/end date/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /check balance/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /submit/i })).toBeVisible();
});

test("selecting a leave type populates the dropdown", async ({ page }) => {
  const select = page.getByLabel(/leave type/i);
  await select.selectOption({ index: 1 });
  const selected = await select.inputValue();
  expect(selected).not.toBe("");
});

test("balance check button is clickable and page does not crash", async ({ page }) => {
  await page.getByLabel(/leave type/i).selectOption({ index: 1 });
  await page.getByLabel(/start date/i).fill(nextMonth(5));
  await page.getByLabel(/end date/i).fill(nextMonth(6));
  await page.getByRole("button", { name: /check balance/i }).click();
  // After clicking, the page must not show an unhandled error
  await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  // The button should still be present (page didn't crash)
  await expect(page.getByRole("button", { name: /check balance/i })).toBeVisible();
});

test("half day checkbox reveals AM/PM picker", async ({ page }) => {
  await page.getByLabel(/half day/i).check();
  await expect(page.getByTitle(/half day type/i)).toBeVisible();
});

test("sick leave >2 days shows medical certificate warning", async ({ page }) => {
  // Select leave type with code SL
  const select = page.getByLabel(/leave type/i);
  const options = await select.locator("option").all();
  let found = false;
  for (const opt of options) {
    const text = await opt.textContent();
    if (text && /sick|SL/i.test(text)) {
      await select.selectOption({ label: text.trim() });
      found = true;
      break;
    }
  }
  if (!found) return; // Skip if no sick leave type configured

  await page.getByLabel(/start date/i).fill(nextMonth(1));
  await page.getByLabel(/end date/i).fill(nextMonth(5));
  await expect(page.getByText(/medical certificate required/i)).toBeVisible();
});

test("sick leave >2 days: submit blocked without medical cert", async ({ page }) => {
  const select = page.getByLabel(/leave type/i);
  const options = await select.locator("option").all();
  let found = false;
  for (const opt of options) {
    const text = await opt.textContent();
    if (text && /sick|SL/i.test(text)) {
      await select.selectOption({ label: text.trim() });
      found = true;
      break;
    }
  }
  if (!found) return;

  await page.getByLabel(/start date/i).fill(nextMonth(1));
  await page.getByLabel(/end date/i).fill(nextMonth(5));
  await page.getByRole("button", { name: /submit/i }).click();
  await expect(page.getByText(/medical certificate is required/i)).toBeVisible();
});
