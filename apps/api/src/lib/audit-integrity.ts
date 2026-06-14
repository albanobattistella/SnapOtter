import { createHmac } from "node:crypto";

export function canonicalize(obj: unknown): string {
  if (obj === null || obj === undefined) return "null";
  if (typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(canonicalize).join(",")}]`;

  const sorted = Object.keys(obj as Record<string, unknown>)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalize((obj as Record<string, unknown>)[k])}`)
    .join(",");
  return `{${sorted}}`;
}

export function computeHmac(data: Record<string, unknown>, key: Buffer): string {
  return createHmac("sha256", key).update(canonicalize(data)).digest("hex");
}

export function verifyHmac(data: Record<string, unknown>, hmac: string, key: Buffer): boolean {
  const computed = computeHmac(data, key);
  return computed === hmac;
}
