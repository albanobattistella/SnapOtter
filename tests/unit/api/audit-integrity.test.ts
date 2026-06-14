import { describe, expect, it } from "vitest";
import {
  canonicalize,
  computeHmac,
  verifyHmac,
} from "../../../apps/api/src/lib/audit-integrity.js";

describe("audit integrity", () => {
  const testKey = Buffer.from("a".repeat(64), "hex");

  it("canonicalizes with sorted keys", () => {
    const input = { z: 1, a: 2, m: { b: 3, a: 4 } };
    const result = canonicalize(input);
    expect(result).toBe('{"a":2,"m":{"a":4,"b":3},"z":1}');
  });

  it("canonicalizes with null values included", () => {
    const input = { a: null, b: "test" };
    expect(canonicalize(input)).toBe('{"a":null,"b":"test"}');
  });

  it("canonicalizes arrays", () => {
    const input = { items: [3, 1, 2] };
    expect(canonicalize(input)).toBe('{"items":[3,1,2]}');
  });

  it("computes deterministic HMAC", () => {
    const data = { event: "LOGIN_SUCCESS", actorId: "u1" };
    const hmac1 = computeHmac(data, testKey);
    const hmac2 = computeHmac(data, testKey);
    expect(hmac1).toBe(hmac2);
  });

  it("computes and verifies HMAC", () => {
    const data = { event: "LOGIN_SUCCESS", actorId: "u1" };
    const hmac = computeHmac(data, testKey);
    expect(verifyHmac(data, hmac, testKey)).toBe(true);
  });

  it("detects tampering", () => {
    const data = { event: "LOGIN_SUCCESS", actorId: "u1" };
    const hmac = computeHmac(data, testKey);
    const tampered = { ...data, actorId: "u2" };
    expect(verifyHmac(tampered, hmac, testKey)).toBe(false);
  });

  it("key ordering does not affect HMAC", () => {
    const data1 = { b: 2, a: 1 };
    const data2 = { a: 1, b: 2 };
    expect(computeHmac(data1, testKey)).toBe(computeHmac(data2, testKey));
  });
});
