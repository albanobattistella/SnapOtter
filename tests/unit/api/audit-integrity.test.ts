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

  it("canonicalizes deeply nested objects (3+ levels)", () => {
    const input = { a: { b: { c: { d: 42 } } } };
    expect(canonicalize(input)).toBe('{"a":{"b":{"c":{"d":42}}}}');
  });

  it("canonicalizes empty object", () => {
    expect(canonicalize({})).toBe("{}");
  });

  it("canonicalizes empty array", () => {
    expect(canonicalize({ list: [] })).toBe('{"list":[]}');
  });

  it("canonicalizes mixed types", () => {
    const input = {
      str: "hello",
      num: 42,
      bool: true,
      nil: null,
      arr: [1, "two"],
      obj: { nested: true },
    };
    const result = canonicalize(input);
    expect(result).toBe(
      '{"arr":[1,"two"],"bool":true,"nil":null,"num":42,"obj":{"nested":true},"str":"hello"}',
    );
  });

  it("serializes undefined values as null in canonicalization", () => {
    const input = { a: 1, b: undefined, c: 3 };
    const result = canonicalize(input);
    expect(result).toBe('{"a":1,"b":null,"c":3}');
  });

  it("produces different HMACs for different keys", () => {
    const data = { event: "TEST" };
    const key1 = Buffer.from("a".repeat(64), "hex");
    const key2 = Buffer.from("b".repeat(64), "hex");
    expect(computeHmac(data, key1)).not.toBe(computeHmac(data, key2));
  });

  it("verifyHmac returns false for empty HMAC string", () => {
    const data = { event: "TEST" };
    expect(verifyHmac(data, "", testKey)).toBe(false);
  });

  it("verifyHmac returns false for malformed HMAC string", () => {
    const data = { event: "TEST" };
    expect(verifyHmac(data, "not-a-valid-hex-hmac", testKey)).toBe(false);
  });

  it("verifyHmac returns false for completely wrong HMAC", () => {
    const data = { event: "TEST" };
    const wrongHmac = "ff".repeat(32);
    expect(verifyHmac(data, wrongHmac, testKey)).toBe(false);
  });

  it("key order does not matter with 5+ keys", () => {
    const forward = { alpha: 1, bravo: 2, charlie: 3, delta: 4, echo: 5, foxtrot: 6 };
    const reverse = { foxtrot: 6, echo: 5, delta: 4, charlie: 3, bravo: 2, alpha: 1 };
    const scrambled = { charlie: 3, alpha: 1, foxtrot: 6, bravo: 2, echo: 5, delta: 4 };
    const hmac = computeHmac(forward, testKey);
    expect(computeHmac(reverse, testKey)).toBe(hmac);
    expect(computeHmac(scrambled, testKey)).toBe(hmac);
  });
});
