import { vi } from "vitest";
import type { EnterpriseFeature } from "@snapotter/enterprise";

export function mockEnterpriseFeatures(features: EnterpriseFeature[]) {
  vi.doMock("@snapotter/enterprise", () => ({
    isFeatureEnabled: (feature: string) =>
      features.includes(feature as EnterpriseFeature),
    getActiveLicense: () => ({
      org: "test-org",
      plan: "enterprise" as const,
      features,
      seats: 100,
      expiresAt: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      issuedAt: new Date().toISOString(),
    }),
    initEnterprise: vi.fn(),
    loadS3Storage: vi.fn(),
    ENTERPRISE_FEATURES: features,
    PLAN_FEATURES: { team: [], enterprise: features },
  }));
}

export function mockNoEnterprise() {
  vi.doMock("@snapotter/enterprise", () => ({
    isFeatureEnabled: () => false,
    getActiveLicense: () => null,
    initEnterprise: vi.fn(),
    loadS3Storage: vi.fn(),
    ENTERPRISE_FEATURES: [],
    PLAN_FEATURES: { team: [], enterprise: [] },
  }));
}
