/**
 * Leave approvals spec — pending/history tabs, email action banner.
 * Project: manager
 */
import { test, expect } from "@playwright/test";

test.describe("approvals tabs", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/approvals");
    // Wait for auth + page to fully load before each test
    await expect(page.getByRole("button", { name: /pending/i })).toBeVisible({ timeout: 20_000 });
  });

  test("approvals page renders pending and history tabs", async ({ page }) => {
    await expect(page.getByRole("button", { name: /pending/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /history/i })).toBeVisible();
  });

  test("history tab is accessible", async ({ page }) => {
    await page.getByRole("button", { name: /history/i }).click();
    // Should show history content or empty state — not an error
    await expect(page.getByText(/error|something went wrong/i)).not.toBeVisible();
  });

  test("pending tab shows content or empty state without error", async ({ page }) => {
    await expect(page.getByText(/error|something went wrong/i)).not.toBeVisible();
  });
});

test.describe("email action banner", () => {
  test("email action banner shows APPROVED confirmation from query param", async ({ page }) => {
    await page.goto("/approvals?action=approve&request_id=1");
    // Wait for auth to resolve and page to mount (Pending tab is the auth gate)
    await expect(page.getByRole("button", { name: /pending/i })).toBeVisible({ timeout: 20_000 });
    // Banner renders after useEffect fires (one extra render cycle after mount)
    await expect(page.getByText(/approved.*via email/i)).toBeVisible({ timeout: 5_000 });
  });

  test("email action banner shows REJECTED confirmation from query param", async ({ page }) => {
    await page.goto("/approvals?action=reject&request_id=1");
    await expect(page.getByRole("button", { name: /pending/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/rejected.*via email/i)).toBeVisible({ timeout: 5_000 });
  });

  test("email banner can be dismissed", async ({ page }) => {
    await page.goto("/approvals?action=approve&request_id=1");
    await expect(page.getByRole("button", { name: /pending/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/approved.*via email/i)).toBeVisible({ timeout: 5_000 });
    await page.getByRole("button", { name: "Dismiss", exact: true }).click();
    await expect(page.getByText(/approved.*via email/i)).not.toBeVisible();
  });
});
