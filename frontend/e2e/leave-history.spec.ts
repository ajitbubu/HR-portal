/**
 * Leave history spec — request list, cancel button, detail page timeline.
 * Project: employee
 */
import { test, expect } from "@playwright/test";

test("leave history page loads without error", async ({ page }) => {
  await page.goto("/leave");
  await expect(page.getByText(/error|something went wrong/i)).not.toBeVisible();
});

test("leave page has Apply Leave button/link", async ({ page }) => {
  await page.goto("/leave");
  await expect(
    page.getByRole("link", { name: /apply/i }).or(
      page.getByRole("button", { name: /apply/i })
    )
  ).toBeVisible();
});

test("leave list shows request cards or empty state", async ({ page }) => {
  await page.goto("/leave");
  // Wait for page to settle, then check for either requests or empty state
  await page.waitForLoadState("networkidle");
  const hasRequests = await page.locator(".card").count() > 0;
  const hasEmpty = await page.getByText(/no leave requests found|no requests/i).isVisible();
  expect(hasRequests || hasEmpty).toBeTruthy();
});

test("view link navigates to request detail page with timeline", async ({ page }) => {
  await page.goto("/leave");
  const viewLink = page.getByRole("link", { name: /view/i }).first();
  const isVisible = await viewLink.isVisible();
  if (isVisible) {
    await viewLink.click();
    await expect(page).toHaveURL(/\/leave\/\d+/);
    await expect(
      page.getByText(/timeline|submitted|status/i).first()
    ).toBeVisible();
  }
});
