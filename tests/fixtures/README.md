# Test Fixtures

Shared test fixtures for the SnapOtter test suite. Organized in two tiers:

## Two-Tier Structure

**Tier 1: Tiny Synthetics (matrices/format coverage)**
Small, project-generated files for format-compatibility matrices and fast unit tests.
Located in `media/`, `documents/`, `data/`, `formats/`, and root-level `test-*` files.

**Tier 2: Real Heroes (depth/fidelity testing)**
Larger, content-representative files for integration and fidelity tests.
Located in `content/`. Each must be tracked in `manifest.json` with sha256 + provenance.

## Layout (Modality-First, Phase 6 Target)

```
tests/fixtures/
  index.ts            # Typed registry (import paths from here, not raw strings)
  manifest.json       # sha256 + bytes + provenance for content/ heroes
  gen-manifest.mjs    # Script to re-stamp manifest hashes
  LICENSES.md         # Provenance audit trail
  content/            # Tier-2 real heroes
  formats/            # Tier-1 format samples (35 formats incl. RAW)
  media/              # Tier-1 tiny audio/video samples
  documents/          # Tier-1 tiny document samples
  data/               # Tier-1 tiny data samples (csv, json, xml, etc.)
  hostile/            # Malformed/bomb/polyglot files for rejection tests
  security/           # XXE, SSRF test vectors
  image/              # (Phase 6) modality-first target dir
  video/              # (Phase 6) modality-first target dir
  audio/              # (Phase 6) modality-first target dir
  document/           # (Phase 6) modality-first target dir
  data/               # (Phase 6) modality-first target dir
```

## Using the Registry

Always import paths from `tests/fixtures/index.ts` rather than hard-coding paths:

```ts
import { fixtures, readFixture } from "../../fixtures/index.js";

// Direct path access
const pngPath = fixtures.image.base.png200;

// Read bytes
const buffer = readFixture(fixtures.image.base.png200);

// Format accessor (for matrix iteration)
const arwPath = fixtures.image.formats("arw");
const mp4Path = fixtures.video.tiny("mp4");
```

## Adding a Fixture

1. Add the file to the appropriate directory
2. Add a key in `tests/fixtures/index.ts` pointing to it
3. Run `node tests/fixtures/gen-manifest.mjs` if the file is in `content/`
4. Fill in `sourceUrl` and `license` in `manifest.json` (required for Phase 2+)
5. Update `LICENSES.md` with the provenance record
6. Run the guards: `pnpm vitest run tests/unit/fixtures/ tests/integration/fixtures/`

## Licensing Gate

Phase 1 allows `UNVERIFIED` provenance. Phase 2 enforces that every `content/` hero
has a verified license (CC0, CC-BY, CC-BY-SA, or public-domain). See `LICENSES.md`
for the current audit status.

## Guard Tests

Four guard tests protect fixture integrity:

- **fixture-resolve** (unit): every registry path exists and is non-empty
- **fixture-budget** (unit): per-extension size caps prevent bloat
- **fixture-manifest** (unit): sha256/bytes in manifest.json match disk
- **fixture-integrity** (integration): real heroes decode through Sharp/ffprobe/qpdf
