import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const thisDir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(
  resolve(thisDir, "../../../apps/api/src/jobs/alert-evaluator.ts"),
  "utf-8",
);

describe("alert-evaluator module exports", () => {
  it("exports evaluateAlerts as a function", async () => {
    const mod = await import("../../../apps/api/src/jobs/alert-evaluator.js");
    expect(typeof mod.evaluateAlerts).toBe("function");
  });

  it("evaluateAlerts is the only named export", async () => {
    const mod = await import("../../../apps/api/src/jobs/alert-evaluator.js");
    expect(Object.keys(mod)).toEqual(["evaluateAlerts"]);
  });
});

describe("alert-evaluator thresholds", () => {
  it("disk space threshold is 1 GB", () => {
    expect(source).toMatch(/freeGb\s*<\s*1[^0-9]/);
  });

  it("disk space alert reports threshold of 1", () => {
    expect(source).toMatch(/threshold:\s*1\b/);
  });

  it("auth anomaly threshold is 20 failures", () => {
    expect(source).toMatch(/count\s*>\s*20/);
  });

  it("auth anomaly window is 5 minutes", () => {
    expect(source).toMatch(/5\s*\*\s*60\s*\*\s*1000/);
  });

  it("auth anomaly alert reports windowMinutes of 5", () => {
    expect(source).toMatch(/windowMinutes:\s*5/);
  });

  it("backup staleness threshold is 48 hours", () => {
    expect(source).toMatch(/ageHours\s*>\s*48/);
  });

  it("backup staleness alert reports threshold of 48", () => {
    expect(source).toMatch(/threshold:\s*48/);
  });

  it("license expiry warning threshold is 30 days", () => {
    expect(source).toMatch(/daysLeft\s*<\s*30/);
  });
});

describe("alert-evaluator conditions", () => {
  it("checks disk_space_low condition", () => {
    expect(source).toContain('"disk_space_low"');
  });

  it("checks auth_anomaly condition", () => {
    expect(source).toContain('"auth_anomaly"');
  });

  it("checks backup_stale condition", () => {
    expect(source).toContain('"backup_stale"');
  });

  it("checks backup_never_run condition", () => {
    expect(source).toContain('"backup_never_run"');
  });

  it("checks license_expiring condition", () => {
    expect(source).toContain('"license_expiring"');
  });

  it("only delivers to enabled webhooks of type alerts", () => {
    expect(source).toContain('d.type === "alerts"');
  });
});
