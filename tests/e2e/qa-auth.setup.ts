import fs from "node:fs";
import path from "node:path";
import { test as setup } from "@playwright/test";

const authFile = path.join(process.cwd(), ".playwright", ".auth", "qa-user.json");

setup("authenticate for QA", async ({ page }) => {
  const dir = path.dirname(authFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  await page.goto("/login");
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin");
  await page.getByRole("button", { name: /login/i }).click();

  const handle = await page.waitForFunction(() => localStorage.getItem("snapotter-token"), null, {
    timeout: 15_000,
  });
  const token = await handle.jsonValue();

  // Dismiss analytics consent via API (use same baseURL)
  await page.request
    .put("/api/v1/user/analytics", {
      headers: { Authorization: `Bearer ${token}` },
      data: { enabled: false },
    })
    .catch(() => {});

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForURL((url) => url.pathname === "/", { timeout: 15_000 }).catch(() => {});
  await page.waitForLoadState("load");

  await page.context().storageState({ path: authFile });
});
