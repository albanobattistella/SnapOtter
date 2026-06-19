#!/usr/bin/env node
// Stamps sha256 + bytes for the real `content/` heroes into manifest.json.
// Provenance (sourceUrl/license) is filled by hand in Step 2 -- this only fills hashes.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const contentDir = join(ROOT, "content");
const existing = JSON.parse(readFileSync(join(ROOT, "manifest.json"), "utf8"));
const byPath = new Map(existing.assets.map((a) => [a.path, a]));

for (const name of readdirSync(contentDir)) {
  const rel = `content/${name}`;
  const bytes = readFileSync(join(contentDir, name));
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const prev = byPath.get(rel) ?? { path: rel, sourceUrl: "UNVERIFIED", license: "UNVERIFIED", toolsServed: [] };
  byPath.set(rel, { ...prev, sha256, bytes: bytes.length });
}
const assets = [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
writeFileSync(join(ROOT, "manifest.json"), JSON.stringify({ assets }, null, 2));
console.log(`manifest: ${assets.length} assets`);
