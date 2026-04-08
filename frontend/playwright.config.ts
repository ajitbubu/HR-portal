import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: "**/auth.setup.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    // Auth spec runs without storageState (does its own login)
    {
      name: "auth",
      testMatch: "**/auth.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    // Employee role: leave, WFH, comp-off (apply), dashboard, employees, notifications
    {
      name: "employee",
      testMatch: [
        "**/dashboard.spec.ts",
        "**/leave-apply.spec.ts",
        "**/leave-history.spec.ts",
        "**/leave-calendar.spec.ts",
        "**/comp-off.spec.ts",
        "**/wfh.spec.ts",
        "**/employees.spec.ts",
        "**/notifications.spec.ts",
      ],
      use: { ...devices["Desktop Chrome"], storageState: ".auth/employee.json" },
      dependencies: ["setup"],
    },
    // Manager role: approvals
    {
      name: "manager",
      testMatch: ["**/leave-approvals.spec.ts"],
      use: { ...devices["Desktop Chrome"], storageState: ".auth/manager.json" },
      dependencies: ["setup"],
    },
    // HR role: reports
    {
      name: "hr",
      testMatch: ["**/reports.spec.ts"],
      use: { ...devices["Desktop Chrome"], storageState: ".auth/hr.json" },
      dependencies: ["setup"],
    },
    // Admin role: admin-* specs
    {
      name: "admin",
      testMatch: ["**/admin-*.spec.ts"],
      use: { ...devices["Desktop Chrome"], storageState: ".auth/admin.json" },
      dependencies: ["setup"],
    },
  ],
});
