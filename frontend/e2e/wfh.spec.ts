/**
 * WFH spec — request list, apply page, manager approvals.
 * Project: employee (list + apply), manager (approvals)
 */
import { test, expect } from "@playwright/test";

test("WFH page loads without error", async ({ page }) => {
  await page.goto("/wfh");
  await expect(page.getByText(/error|something went wrong/i)).not.toBeVisible();
});

test("WFH page shows New WFH Request link", async ({ page }) => {
  await page.goto("/wfh");
  // Link text is "+ New WFH Request"
  await expect(
    page.getByRole("link", { name: /new wfh request/i })
  ).toBeVisible({ timeout: 8_000 });
});

test("WFH apply page renders date and reason fields", async ({ page }) => {
  await page.goto("/wfh/apply");
  await expect(
    page.locator('input[type="date"]').or(page.getByLabel(/date/i)).first()
  ).toBeVisible({ timeout: 8_000 });
  await expect(
    page.locator("textarea").or(page.getByLabel(/reason/i)).first()
  ).toBeVisible();
});

test("WFH approvals page loads for manager", async ({ page }) => {
  await page.goto("/wfh/approvals");
  await expect(page.getByText(/error|something went wrong/i)).not.toBeVisible();
  await expect(page.getByText(/wfh|work from home|approvals?/i).first()).toBeVisible();
});
