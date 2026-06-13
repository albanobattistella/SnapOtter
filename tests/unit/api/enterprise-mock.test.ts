import { describe, it, expect, vi, beforeEach } from "vitest";

describe("enterprise mock", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("mocks feature enabled", async () => {
    const { mockEnterpriseFeatures } = await import(
      "../../helpers/enterprise-mock.js"
    );
    mockEnterpriseFeatures(["audit_export", "siem_forwarding"]);
    const { isFeatureEnabled } = await import("@snapotter/enterprise");
    expect(isFeatureEnabled("audit_export")).toBe(true);
    expect(isFeatureEnabled("siem_forwarding")).toBe(true);
    expect(isFeatureEnabled("scim")).toBe(false);
  });

  it("mocks no enterprise", async () => {
    const { mockNoEnterprise } = await import(
      "../../helpers/enterprise-mock.js"
    );
    mockNoEnterprise();
    const { isFeatureEnabled } = await import("@snapotter/enterprise");
    expect(isFeatureEnabled("audit_export")).toBe(false);
  });

  it("returns license payload with correct shape", async () => {
    const { mockEnterpriseFeatures } = await import(
      "../../helpers/enterprise-mock.js"
    );
    mockEnterpriseFeatures(["s3_storage", "mfa"]);
    const { getActiveLicense } = await import("@snapotter/enterprise");
    const license = getActiveLicense();
    expect(license).not.toBeNull();
    expect(license!.org).toBe("test-org");
    expect(license!.plan).toBe("enterprise");
    expect(license!.features).toEqual(["s3_storage", "mfa"]);
    expect(license!.seats).toBe(100);
    expect(new Date(license!.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("returns null license when no enterprise", async () => {
    const { mockNoEnterprise } = await import(
      "../../helpers/enterprise-mock.js"
    );
    mockNoEnterprise();
    const { getActiveLicense } = await import("@snapotter/enterprise");
    expect(getActiveLicense()).toBeNull();
  });
});
