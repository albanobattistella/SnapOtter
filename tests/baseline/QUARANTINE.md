# Quarantine List (Phase 0 Baseline)

Items deferred from this baseline capture. Phase 4 (e2e serial-bucket repair)
empties this file.

## E2E serial bucket (known-red, pre-2.0-UI selectors)

The following `chromium-serial` specs rely on pre-2.0 selectors and are not yet
updated. They are the explicit subject of Phase 4, not repaired here:

- `gui-settings-general.spec.ts`
- `gui-settings-rbac.spec.ts`
- `gui-settings-people.spec.ts`
- `rbac.spec.ts`
- `rbac-full.spec.ts`
- `people.spec.ts`
- `theme.spec.ts`

## Docker suite (`pnpm test:docker`)

The full-container install-smoke gate (`docker-compose.test.yml`) churns tens of
GB of build cache on this machine (see CLAUDE.md ops note). It is run and
elevated in Phase 4. Last-known CI status: see `.github/workflows/test.yml`
(the `docker` job).

## Local doc-binary skips (not quarantine, informational)

The following integration test files skip cleanly via `describe.skipIf`
because `pandoc`, `libreoffice`/`soffice`, `pdfcpu`, and `pdf2docx` are not
installed on this development machine. These pass in CI where the Docker image
provides all binaries:

- `convert-document.test.ts`
- `epub-convert.test.ts`
- `html-to-pdf.test.ts`
- `doc-to-pdf.test.ts`
- `pdf-to-docx.test.ts`
- `compress-pdf.test.ts`
- `pdf-to-image.test.ts`

Total local integration skips: 217 tests across 7 files.
