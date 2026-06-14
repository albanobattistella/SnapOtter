import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, schema } from "../../apps/api/src/db/index.js";
import { buildTestApp, loginAsAdmin, type TestApp } from "./test-server.js";

let testApp: TestApp;
let adminToken: string;

beforeAll(async () => {
  testApp = await buildTestApp();
  adminToken = await loginAsAdmin(testApp.app);
}, 30_000);

afterAll(async () => {
  await testApp.cleanup();
}, 10_000);

describe("audit export", () => {
  it("returns 403 without enterprise license", async () => {
    const res = await testApp.app.inject({
      method: "GET",
      url: "/api/v1/enterprise/audit/export?format=json",
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error).toContain("enterprise");
  });

  it("returns 403 for CSV format without enterprise license", async () => {
    const res = await testApp.app.inject({
      method: "GET",
      url: "/api/v1/enterprise/audit/export?format=csv",
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns 401 without auth", async () => {
    const res = await testApp.app.inject({
      method: "GET",
      url: "/api/v1/enterprise/audit/export?format=json",
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns 403 for non-admin user", async () => {
    // Create a regular user
    await testApp.app.inject({
      method: "POST",
      url: "/api/auth/register",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        username: "auditexportuser",
        password: "TestPass1",
        role: "user",
      },
    });
    await db
      .update(schema.users)
      .set({ mustChangePassword: false })
      .where(eq(schema.users.username, "auditexportuser"));

    const loginRes = await testApp.app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "auditexportuser", password: "TestPass1" },
    });
    const userToken = JSON.parse(loginRes.body).token;

    const res = await testApp.app.inject({
      method: "GET",
      url: "/api/v1/enterprise/audit/export?format=json",
      headers: { authorization: `Bearer ${userToken}` },
    });
    // Regular users lack audit:read, so they get 403 before the enterprise check
    expect(res.statusCode).toBe(403);
  });
});
