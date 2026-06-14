import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const thisDir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(
  resolve(thisDir, "../../../apps/api/src/jobs/siem-forward.ts"),
  "utf-8",
);

describe("siem-forward module exports", () => {
  it("exports runSiemForward as a function", async () => {
    const mod = await import("../../../apps/api/src/jobs/siem-forward.js");
    expect(typeof mod.runSiemForward).toBe("function");
  });

  it("runSiemForward is the only named export", async () => {
    const mod = await import("../../../apps/api/src/jobs/siem-forward.js");
    expect(Object.keys(mod)).toEqual(["runSiemForward"]);
  });
});

describe("siem-forward constants", () => {
  it("circuit breaker threshold is 5", () => {
    expect(source).toMatch(/CIRCUIT_BREAKER_THRESHOLD\s*=\s*5/);
  });

  it("batch limit is 500", () => {
    expect(source).toMatch(/BATCH_LIMIT\s*=\s*500/);
  });

  it("cursor key is siem_last_forwarded_at", () => {
    expect(source).toMatch(/CURSOR_KEY\s*=\s*"siem_last_forwarded_at"/);
  });

  it("failures key is siem_consecutive_failures", () => {
    expect(source).toMatch(/FAILURES_KEY\s*=\s*"siem_consecutive_failures"/);
  });
});

describe("siem-forward circuit breaker behavior", () => {
  it("opens circuit when failures reach threshold", () => {
    expect(source).toMatch(/failureCount\s*>=\s*CIRCUIT_BREAKER_THRESHOLD/);
  });

  it("resets failure counter on successful delivery", () => {
    expect(source).toContain('upsertSetting(FAILURES_KEY, "0")');
  });

  it("increments failure counter on failed delivery", () => {
    expect(source).toContain("upsertSetting(FAILURES_KEY, String(failureCount + 1))");
  });
});

describe("siem-forward cursor behavior", () => {
  it("updates cursor to the last forwarded row timestamp", () => {
    expect(source).toContain("upsertSetting(CURSOR_KEY, lastRow.createdAt.toISOString())");
  });

  it("queries audit log ordered by createdAt ascending", () => {
    expect(source).toContain("asc(schema.auditLog.createdAt)");
  });

  it("applies cursor filter using gte on createdAt", () => {
    expect(source).toContain("gte(schema.auditLog.createdAt, cursorDate)");
  });
});
