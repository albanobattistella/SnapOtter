import { describe, expect, it, vi } from "vitest";

vi.mock("../../../apps/api/src/config.js", () => ({
  env: {
    API_KEYS_RATE_LIMIT_PER_MIN: 30,
    SESSION_DURATION_HOURS: 168,
    DEFAULT_PASSWORD: "Adminpass1",
    SKIP_MUST_CHANGE_PASSWORD: true,
    AUTH_ENABLED: true,
    EXTERNAL_URL: "",
  },
}));

vi.mock("../../../apps/api/src/db/index.js", () => ({
  db: {},
  schema: {},
}));

vi.mock("../../../apps/api/src/lib/audit.js", () => ({
  auditFromRequest: () => vi.fn(),
  sanitizeAuditInput: (value: string) => value,
}));

vi.mock("../../../apps/api/src/jobs/connection.js", () => ({
  sharedRedis: () => ({
    setex: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
  }),
}));

vi.mock("../../../apps/api/src/lib/metrics.js", () => ({
  authAttempts: { inc: vi.fn() },
}));

vi.mock("../../../apps/api/src/lib/settings-helpers.js", () => ({
  getSettingNumber: vi.fn().mockResolvedValue(0),
  getSettingString: vi.fn().mockResolvedValue("optional"),
}));

import { deriveApiKeyPermissionsForCreate } from "../../../apps/api/src/routes/api-keys.js";

describe("deriveApiKeyPermissionsForCreate", () => {
  it("defaults a scoped caller's new key to the caller's effective scope", async () => {
    const scoped = await deriveApiKeyPermissionsForCreate({
      id: "u1",
      username: "admin",
      role: "admin",
      apiKeyPermissions: ["tools:use", "apikeys:own"],
    });

    expect(scoped).toEqual({
      permissions: ["tools:use", "apikeys:own"],
      invalid: [],
    });
  });

  it("rejects requested permissions outside the caller's API key scope", async () => {
    const scoped = await deriveApiKeyPermissionsForCreate(
      {
        id: "u1",
        username: "admin",
        role: "admin",
        apiKeyPermissions: ["tools:use", "apikeys:own"],
      },
      ["tools:use", "users:manage"],
    );

    expect(scoped).toEqual({
      permissions: ["tools:use", "users:manage"],
      invalid: ["users:manage"],
    });
  });

  it("keeps unscoped session-created keys unscoped when no scope is requested", async () => {
    const scoped = await deriveApiKeyPermissionsForCreate({
      id: "u1",
      username: "admin",
      role: "admin",
    });

    expect(scoped).toEqual({ permissions: null, invalid: [] });
  });
});
