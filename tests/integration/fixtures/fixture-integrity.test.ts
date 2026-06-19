import { execFileSync } from "node:child_process";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { fixtures } from "../../fixtures/index.js";

const ffprobe = process.env.FFPROBE_PATH || "ffprobe";
const qpdf = process.env.QPDF_PATH || "qpdf";

describe("real fixtures decode through their real tools", () => {
  // JPEG/PNG/WEBP only -- formats Sharp decodes unconditionally. HEIC/HEIF heroes
  // (portrait.heic, motorcycle.heif) are exercised by the real tool routes in the
  // Phase 2 depth tests, where the factory's HEIC decode path is in play.
  it.each([
    fixtures.image.portrait.jpg,
    fixtures.image.redEye,
    fixtures.image.ocr.clean,
    fixtures.image.ocr.japanese,
    fixtures.image.multiFace,
  ])("Sharp decodes %s with sane dimensions", async (path) => {
    const meta = await sharp(path).metadata();
    expect((meta.width ?? 0) * (meta.height ?? 0)).toBeGreaterThan(64 * 64);
  });

  it.each([
    fixtures.video.hero.mp4,
    fixtures.audio.speech.wav,
    fixtures.audio.tagged,
  ])("ffprobe reads a positive duration from %s", (path) => {
    const out = execFileSync(
      ffprobe,
      ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
      { encoding: "utf8" },
    );
    expect(Number.parseFloat(out.trim())).toBeGreaterThan(0);
  });

  it.each([
    fixtures.document.pdfMulti,
    fixtures.document.pdfScanned,
  ])("qpdf reports pages for %s", (path) => {
    const out = execFileSync(qpdf, ["--show-npages", path], { encoding: "utf8" });
    expect(Number.parseInt(out.trim(), 10)).toBeGreaterThan(0);
  });
});
