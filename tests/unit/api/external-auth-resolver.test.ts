import { describe, expect, it } from "vitest";

// ── Pure function tests (no DB required) ─────────────────────────

describe("external auth resolver", () => {
  it("module exports resolveExternalUser", async () => {
    const mod = await import("../../../apps/api/src/lib/external-auth-resolver.js");
    expect(typeof mod.resolveExternalUser).toBe("function");
  });

  it("module exports sanitizeUsername", async () => {
    const mod = await import("../../../apps/api/src/lib/external-auth-resolver.js");
    expect(typeof mod.sanitizeUsername).toBe("function");
  });

  it("module exports findUniqueUsername", async () => {
    const mod = await import("../../../apps/api/src/lib/external-auth-resolver.js");
    expect(typeof mod.findUniqueUsername).toBe("function");
  });
});

describe("sanitizeUsername", () => {
  let sanitizeUsername: (raw: string) => string;

  beforeAll(async () => {
    const mod = await import("../../../apps/api/src/lib/external-auth-resolver.js");
    sanitizeUsername = mod.sanitizeUsername;
  });

  it("lowercases input", () => {
    expect(sanitizeUsername("JohnDoe")).toBe("johndoe");
  });

  it("replaces non-alphanumeric characters with underscores", () => {
    expect(sanitizeUsername("john doe!")).toBe("john_doe");
  });

  it("collapses multiple underscores", () => {
    expect(sanitizeUsername("john___doe")).toBe("john_doe");
  });

  it("strips leading and trailing separators", () => {
    expect(sanitizeUsername("_john_")).toBe("john");
    expect(sanitizeUsername(".john.")).toBe("john");
    expect(sanitizeUsername("-john-")).toBe("john");
  });

  it("truncates to 46 characters", () => {
    const long = "a".repeat(60);
    expect(sanitizeUsername(long).length).toBe(46);
  });

  it("pads short usernames to 3 characters", () => {
    expect(sanitizeUsername("ab").length).toBe(3);
    expect(sanitizeUsername("ab")).toBe("ab_");
  });

  it("preserves dots and hyphens", () => {
    expect(sanitizeUsername("john.doe")).toBe("john.doe");
    expect(sanitizeUsername("john-doe")).toBe("john-doe");
  });

  it("handles email addresses as input", () => {
    expect(sanitizeUsername("user@example.com")).toBe("user_example.com");
  });

  it("handles empty-after-strip edge case", () => {
    // All characters stripped, then padded
    const result = sanitizeUsername("___");
    expect(result.length).toBeGreaterThanOrEqual(3);
  });
});
