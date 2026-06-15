import sharp from "sharp";
import type { CompressOptions, Sharp } from "../types.js";

const FORMAT_MAP: Record<string, string> = {
  jpg: "jpeg",
  jpeg: "jpeg",
  png: "png",
  webp: "webp",
  avif: "avif",
  heif: "avif",
  tiff: "tiff",
  gif: "gif",
  jxl: "jxl",
};

/** Formats that Sharp cannot encode — fall back to PNG for output. */
const NO_ENCODER = new Set(["svg", "raw", "tga", "psd", "exr", "hdr"]);

function formatOpts(format: string, quality: number): Record<string, unknown> {
  const opts: Record<string, unknown> = { quality };
  if (format === "avif") opts.effort = 4;
  return opts;
}

export async function compress(image: Sharp, options: CompressOptions): Promise<Sharp> {
  const { quality, targetSizeBytes, format } = options;

  const metadata = await image.metadata();
  const detected = metadata.format ?? "jpeg";
  // Fall back to PNG for formats Sharp cannot encode (SVG, BMP, etc.)
  const safeDetected = NO_ENCODER.has(detected) ? "png" : detected;
  const outputFormat = (FORMAT_MAP[format ?? ""] ??
    FORMAT_MAP[safeDetected] ??
    safeDetected) as keyof sharp.FormatEnum;

  if (targetSizeBytes !== undefined) {
    if (targetSizeBytes <= 0) {
      throw new Error("Target size must be greater than 0");
    }
    const inputBuffer = await image.toBuffer();
    return compressToTargetSize(inputBuffer, outputFormat, targetSizeBytes);
  }

  const q = quality ?? 80;
  if (q < 1 || q > 100) {
    throw new Error("Quality must be between 1 and 100");
  }

  return image.toFormat(outputFormat, formatOpts(outputFormat, q));
}

async function findBestQuality(
  inputBuffer: Buffer,
  resize: { width: number; height: number } | null,
  format: keyof sharp.FormatEnum,
  targetBytes: number,
): Promise<number | null> {
  let low = 1;
  let high = 100;
  let bestQuality: number | null = null;
  const maxIterations = 12;
  const tolerance = 0.01;

  for (let i = 0; i < maxIterations && low <= high; i++) {
    const mid = Math.min(100, Math.max(1, Math.round((low + high) / 2)));
    let pipeline = sharp(inputBuffer);
    if (resize) pipeline = pipeline.resize(resize.width, resize.height);
    const resultBuffer = await pipeline.toFormat(format, formatOpts(format, mid)).toBuffer();
    const resultSize = resultBuffer.length;

    if (resultSize <= targetBytes) {
      bestQuality = mid;
      if ((targetBytes - resultSize) / targetBytes <= tolerance) break;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return bestQuality;
}

async function compressToTargetSize(
  inputBuffer: Buffer,
  format: keyof sharp.FormatEnum,
  targetBytes: number,
): Promise<Sharp> {
  const quality = await findBestQuality(inputBuffer, null, format, targetBytes);
  if (quality !== null) {
    return sharp(inputBuffer).toFormat(format, formatOpts(format, quality));
  }

  const metadata = await sharp(inputBuffer).metadata();
  const originalWidth = metadata.width ?? 0;
  const originalHeight = metadata.height ?? 0;

  if (originalWidth === 0 || originalHeight === 0) {
    return sharp(inputBuffer).toFormat(format, formatOpts(format, 1));
  }

  const scaleFactor = 0.75;
  const maxScalePasses = 8;
  let lastWidth = originalWidth;
  let lastHeight = originalHeight;

  for (let pass = 1; pass <= maxScalePasses; pass++) {
    const factor = scaleFactor ** pass;
    const newWidth = Math.round(originalWidth * factor);
    const newHeight = Math.round(originalHeight * factor);
    if (newWidth < 10 || newHeight < 10) break;

    lastWidth = newWidth;
    lastHeight = newHeight;

    const dims = { width: newWidth, height: newHeight };
    const q = await findBestQuality(inputBuffer, dims, format, targetBytes);
    if (q !== null) {
      return sharp(inputBuffer).resize(newWidth, newHeight).toFormat(format, formatOpts(format, q));
    }
  }

  return sharp(inputBuffer).resize(lastWidth, lastHeight).toFormat(format, formatOpts(format, 1));
}
