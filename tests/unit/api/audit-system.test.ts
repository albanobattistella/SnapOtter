import { describe, expect, it } from "vitest";
import { sanitizeAuditInput } from "../../../apps/api/src/lib/audit.js";

describe("sanitizeAuditInput", () => {
  it("strips angle brackets", () => {
    expect(sanitizeAuditInput("<script>alert(1)</script>")).toBe("scriptalert(1)/script");
  });

  it("strips ampersand", () => {
    expect(sanitizeAuditInput("foo&bar")).toBe("foobar");
  });

  it("strips double quotes", () => {
    expect(sanitizeAuditInput('hello"world')).toBe("helloworld");
  });

  it("strips single quotes", () => {
    expect(sanitizeAuditInput("it's")).toBe("its");
  });

  it("strips all dangerous characters in one pass", () => {
    expect(sanitizeAuditInput(`<>&"'`)).toBe("(empty)");
  });

  it("returns (empty) for empty string", () => {
    expect(sanitizeAuditInput("")).toBe("(empty)");
  });

  it("returns (empty) when only special characters remain", () => {
    expect(sanitizeAuditInput("<<>>&&''\"\"")).toBe("(empty)");
  });

  it("does not truncate a string at exactly 200 characters", () => {
    const input = "x".repeat(200);
    expect(sanitizeAuditInput(input)).toBe(input);
    expect(sanitizeAuditInput(input).length).toBe(200);
  });

  it("truncates a 201-character string to 200", () => {
    const input = "y".repeat(201);
    const result = sanitizeAuditInput(input);
    expect(result.length).toBe(200);
    expect(result).toBe("y".repeat(200));
  });

  it("truncates long strings after stripping characters", () => {
    const input = `${"a".repeat(198)}<>${"b".repeat(10)}`;
    const result = sanitizeAuditInput(input);
    expect(result.length).toBe(200);
    expect(result).toBe(`${"a".repeat(198)}bb`);
  });

  it("preserves safe characters unchanged", () => {
    const input = "hello world 123 @#$%^*()_+-=[]{}|;:,.?/~`!";
    expect(sanitizeAuditInput(input)).toBe(input);
  });
});

// deriveTargetType is not exported from audit.ts (private function).
// It is only callable via auditLog(), which requires a live database connection,
// making it unsuitable for a unit test. The mapping is covered by
// integration tests in audit-log-route.test.ts instead.
