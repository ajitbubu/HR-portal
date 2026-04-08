import { test as setup } from "@playwright/test";
import path from "path";
import fs from "fs";

const ROLES = [
  { name: "employee", email: "employee@datasafeguard.us", password: "employee123" },
  { name: "manager", email: "manager@datasafeguard.us", password: "manager123" },
  { name: "hr", email: "hr@datasafeguard.us", password: "hr123" },
  // Admin: sudhir@datasafeguard.ai / Admin@123
  { name: "admin", email: "sudhir@datasafeguard.ai", password: "Admin@123" },
];

// Ensure .auth directory exists
const authDir = path.join(process.cwd(), ".auth");
if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

for (const role of ROLES) {
  setup(`authenticate as ${role.name}`, async ({ page }) => {
    // Authenticate via API directly — avoids React controlled input issues
    const response = await page.request.post(`${API_BASE}/auth/login`, {
      data: { email: role.email, password: role.password },
    });

    if (!response.ok()) {
      const body = await response.text();
      throw new Error(`Login failed for ${role.name}: ${response.status()} ${body}`);
    }

    const { access_token, role: userRole } = await response.json();

    // Navigate to app and inject auth state (localStorage + cookie)
    await page.goto("/");
    await page.evaluate(
      ({ token, roleValue }) => {
        localStorage.setItem("access_token", token);
        document.cookie = `user_role=${roleValue}; path=/; max-age=86400; SameSite=Lax`;
      },
      { token: access_token, roleValue: userRole }
    );

    await page.context().storageState({
      path: path.join(authDir, `${role.name}.json`),
    });
  });
}
