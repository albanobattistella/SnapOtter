import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, schema } from "../../apps/api/src/db/index.js";
import { hashPassword } from "../../apps/api/src/plugins/auth.js";
import { buildTestApp, type TestApp } from "./test-server.js";

let testApp: TestApp;
const SCIM_TOKEN = "test-scim-token-abc123";

beforeAll(async () => {
  testApp = await buildTestApp();

  // Set up a SCIM token hash in the settings table
  const tokenHash = await hashPassword(SCIM_TOKEN);
  await db
    .insert(schema.settings)
    .values({ key: "scim_token_hash", value: tokenHash })
    .onConflictDoNothing();
}, 30_000);

afterAll(async () => {
  await testApp.cleanup();
}, 10_000);

describe("SCIM 2.0 provisioning", () => {
  // ── Discovery (no auth required) ───────────────────────────────

  describe("discovery endpoints", () => {
    it("returns ServiceProviderConfig", async () => {
      const res = await testApp.app.inject({
        method: "GET",
        url: "/api/v1/scim/v2/ServiceProviderConfig",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.schemas).toContain("urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig");
      expect(body.patch.supported).toBe(true);
      expect(body.filter.supported).toBe(true);
    });

    it("returns Schemas", async () => {
      const res = await testApp.app.inject({
        method: "GET",
        url: "/api/v1/scim/v2/Schemas",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.totalResults).toBe(2);
      expect(body.Resources).toHaveLength(2);
      const schemaIds = body.Resources.map((r: { id: string }) => r.id);
      expect(schemaIds).toContain("urn:ietf:params:scim:schemas:core:2.0:User");
      expect(schemaIds).toContain("urn:ietf:params:scim:schemas:core:2.0:Group");
    });

    it("returns ResourceTypes", async () => {
      const res = await testApp.app.inject({
        method: "GET",
        url: "/api/v1/scim/v2/ResourceTypes",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.totalResults).toBe(2);
      const names = body.Resources.map((r: { name: string }) => r.name);
      expect(names).toContain("User");
      expect(names).toContain("Group");
    });
  });

  // ── Auth ───────────────────────────────────────────────────────

  describe("SCIM auth", () => {
    it("returns 401 for user operations without token", async () => {
      const res = await testApp.app.inject({
        method: "GET",
        url: "/api/v1/scim/v2/Users",
      });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.schemas).toContain("urn:ietf:params:scim:api:messages:2.0:Error");
    });

    it("returns 401 with invalid token", async () => {
      const res = await testApp.app.inject({
        method: "GET",
        url: "/api/v1/scim/v2/Users",
        headers: { authorization: "Bearer wrong-token" },
      });
      expect(res.statusCode).toBe(401);
    });

    it("returns 401 for group operations without token", async () => {
      const res = await testApp.app.inject({
        method: "GET",
        url: "/api/v1/scim/v2/Groups",
      });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── Enterprise gate ────────────────────────────────────────────
  // Without a valid enterprise license, SCIM operations return 403.

  describe("enterprise feature gate", () => {
    it("returns 403 for Users list without enterprise license", async () => {
      const res = await testApp.app.inject({
        method: "GET",
        url: "/api/v1/scim/v2/Users",
        headers: { authorization: `Bearer ${SCIM_TOKEN}` },
      });
      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.detail).toContain("enterprise");
    });

    it("returns 403 for Groups list without enterprise license", async () => {
      const res = await testApp.app.inject({
        method: "GET",
        url: "/api/v1/scim/v2/Groups",
        headers: { authorization: `Bearer ${SCIM_TOKEN}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it("returns 403 for POST Users without enterprise license", async () => {
      const res = await testApp.app.inject({
        method: "POST",
        url: "/api/v1/scim/v2/Users",
        headers: { authorization: `Bearer ${SCIM_TOKEN}` },
        payload: { userName: "scim-test-user", active: true },
      });
      expect(res.statusCode).toBe(403);
    });

    it("returns 403 for POST Groups without enterprise license", async () => {
      const res = await testApp.app.inject({
        method: "POST",
        url: "/api/v1/scim/v2/Groups",
        headers: { authorization: `Bearer ${SCIM_TOKEN}` },
        payload: { displayName: "scim-test-group" },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  // ── SCIM error format ──────────────────────────────────────────

  describe("SCIM error format", () => {
    it("returns proper SCIM error schema on 401", async () => {
      const res = await testApp.app.inject({
        method: "GET",
        url: "/api/v1/scim/v2/Users",
        headers: { authorization: "Bearer bad" },
      });
      const body = JSON.parse(res.body);
      expect(body.schemas).toEqual(["urn:ietf:params:scim:api:messages:2.0:Error"]);
      expect(body.status).toBe(401);
      expect(typeof body.detail).toBe("string");
    });
  });
});
