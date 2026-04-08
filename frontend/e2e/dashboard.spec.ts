/**
 * Dashboard spec — verifies role-specific content renders.
 * Run under: employee project (storageState).
 */
import { test, expect } from "@playwright/test";

test("dashboard loads and shows leave balance section", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(
    page.getByText(/leave balance|annual leave|remaining/i).first()
  ).toBeVisible({ timeout: 10_000 });
});

test("dashboard has working navigation links in sidebar", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: /leave/i }).first()).toBeVisible({ timeout: 10_000 });
  // Employee role sees "Directory" (Employees link is admin/hr/manager only)
  await expect(page.getByRole("link", { name: /directory|employees/i }).first()).toBeVisible();
});

test("dashboard shows quick action or stat cards", async ({ page }) => {
  await page.goto("/dashboard");
  // At least one stat card / number should be visible
  await expect(page.locator(".card").first()).toBeVisible({ timeout: 10_000 });
});

test("logout button is visible and redirects to login", async ({ page }) => {
  await page.goto("/dashboard");
  // Sign Out button is in the sidebar (text or title depending on collapsed state)
  const signOut = page.getByRole("button", { name: /sign out/i });
  await expect(signOut).toBeVisible({ timeout: 10_000 });
  await signOut.click();
  await expect(page).toHaveURL(/login/, { timeout: 8_000 });
});
