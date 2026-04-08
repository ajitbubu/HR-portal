/**
 * Auth spec — runs without a saved storageState (fresh browser context).
 * Tests: login page accessibility, API auth, route guards.
 * Project: auth
 */
import { test, expect } from "@playwright/test";

const API_BASE = "http://localhost:8000/api";

test("login page renders sign-in form", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
});

test("valid credentials return JWT token from API", async ({ page }) => {
  const response = await page.request.post(`${API_BASE}/auth/login`, {
    data: { email: "employee@datasafeguard.us", password: "employee123" },
  });
  expect(response.ok()).toBe(true);
  const body = await response.json();
  expect(body.access_token).toBeTruthy();
  expect(body.role).toBe("employee");
});

test("wrong password returns 401 with invalid credentials", async ({ page }) => {
  const response = await page.request.post(`${API_BASE}/auth/login`, {
    data: { email: "employee@datasafeguard.us", password: "wrongpassword" },
  });
  expect(response.status()).toBe(401);
  const body = await response.json();
  expect(body.detail).toMatch(/invalid credentials/i);
});

test("unknown email returns 401", async ({ page }) => {
  const response = await page.request.post(`${API_BASE}/auth/login`, {
    data: { email: "nobody@example.com", password: "anything" },
  });
  expect(response.status()).toBe(401);
});

test("login page has quick-access demo account buttons", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: /employee/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /manager/i })).toBeVisible();
});
