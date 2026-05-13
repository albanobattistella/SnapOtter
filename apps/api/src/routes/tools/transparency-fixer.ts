import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { inpaint, removeBackground } from "@snapotter/ai";
import { getBundleForTool, TOOL_BUNDLE_MAP } from "@snapotter/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import sharp from "sharp";
import { z } from "zod";
import { autoOrient } from "../../lib/auto-orient.js";
import { formatZodErrors } from "../../lib/errors.js";
import { isToolInstalled } from "../../lib/feature-status.js";
import { validateImageBuffer } from "../../lib/file-validation.js";
import { sanitizeFilename } from "../../lib/filename.js";
import { decodeToSharpCompat, needsCliDecode } from "../../lib/format-decoders.js";
import { decodeHeic } from "../../lib/heic-converter.js";
import { createWorkspace } from "../../lib/workspace.js";
import { updateSingleFileProgress } from "../progress.js";
import { registerToolProcessFn } from "../tool-factory.js";

const TOOL_ID = "transparency-fixer";
const DEFAULT_MODEL = "birefnet-hr-matting";
const FALLBACK_MODEL = "birefnet-general";

const settingsSchema = z.object({
  defringe: z.number().min(0).max(100).optional().default(30),
  outputFormat: z.enum(["png", "webp"]).optional().default("png"),
  removeWatermark: z.boolean().optional().default(false),
});

/**
 * Sharp-based defringe post-processing.
 *
 * Removes semi-transparent fringe pixels that rembg sometimes leaves around
 * hair, fur, and fine edges. Works by blurring the alpha channel and zeroing
 * out pixels whose alpha falls below a computed threshold.
 */
async function applyDefringe(buffer: Buffer, intensity: number): Promise<Buffer> {
  if (intensity <= 0) return buffer;

  const img = sharp(buffer);
  const { width, height, channels } = await img.metadata();
  if (!width || !height || channels !== 4) return buffer;

  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const pixelCount = info.width * info.height;

  // Extract alpha channel
  const alpha = Buffer.alloc(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    alpha[i] = data[i * 4 + 3];
  }

  // Blur the alpha channel
  const blurRadius = Math.max(0.3, Math.round(intensity / 20));
  const blurredAlphaRaw = await sharp(alpha, {
    raw: { width: info.width, height: info.height, channels: 1 },
  })
    .blur(blurRadius)
    .raw()
    .toBuffer();

  // Threshold: zero out fringe pixels
  const threshold = Math.round(128 + (intensity / 100) * 80);
  const result = Buffer.from(data);
  for (let i = 0; i < pixelCount; i++) {
    if (alpha[i] > 0 && blurredAlphaRaw[i] < threshold) {
      result[i * 4] = 0;
      result[i * 4 + 1] = 0;
      result[i * 4 + 2] = 0;
      result[i * 4 + 3] = 0;
    }
  }

  return sharp(result, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

async function detectWatermarkMask(
  buffer: Buffer,
): Promise<{ mask: Buffer | null; coverage: number }> {
  const img = sharp(buffer);
  const meta = await img.metadata();
  if (!meta.width || !meta.height || meta.channels !== 4) {
    return { mask: null, coverage: 0 };
  }

  const { width, height } = meta;
  const { data } = await img.raw().toBuffer({ resolveWithObject: true });
  const pixelCount = width * height;

  const luminance = new Float32Array(pixelCount);
  const isForeground = new Uint8Array(pixelCount);
  let fgCount = 0;

  for (let i = 0; i < pixelCount; i++) {
    const a = data[i * 4 + 3];
    if (a > 10) {
      isForeground[i] = 1;
      fgCount++;
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      luminance[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    }
  }

  if (fgCount < 100) return { mask: null, coverage: 0 };

  const grayBuf = Buffer.alloc(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    grayBuf[i] = isForeground[i] ? Math.round(luminance[i]) : 0;
  }

  const blurRadius = Math.max(1, Math.round(Math.min(width, height) / 40));
  const blurredGray = await sharp(grayBuf, {
    raw: { width, height, channels: 1 },
  })
    .blur(blurRadius)
    .raw()
    .toBuffer();

  const candidateMask = new Uint8Array(pixelCount);
  let candidateCount = 0;
  const threshold = 25;

  for (let i = 0; i < pixelCount; i++) {
    if (!isForeground[i]) continue;
    const localAvg = blurredGray[i];
    const deviation = luminance[i] - localAvg;
    if (deviation > threshold) {
      candidateMask[i] = 255;
      candidateCount++;
    }
  }

  if (candidateCount < 10) return { mask: null, coverage: 0 };

  const rawMask = Buffer.from(candidateMask);

  const eroded = await sharp(rawMask, { raw: { width, height, channels: 1 } })
    .blur(1.5)
    .threshold(200)
    .raw()
    .toBuffer();

  const dilated = await sharp(eroded, { raw: { width, height, channels: 1 } })
    .blur(2)
    .threshold(30)
    .raw()
    .toBuffer();

  let finalCount = 0;
  for (let i = 0; i < pixelCount; i++) {
    if (dilated[i] > 0) finalCount++;
  }

  const coverage = fgCount > 0 ? finalCount / fgCount : 0;
  const minCoverage = 0.005;
  const maxCoverage = 0.6;

  if (coverage < minCoverage || coverage > maxCoverage) {
    return { mask: null, coverage };
  }

  const maskPng = await sharp(dilated, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer();

  return { mask: maskPng, coverage };
}

/**
 * Run transparency fix: rembg matting -> defringe -> output format.
 */
async function processTransparencyFix(
  inputBuffer: Buffer,
  settings: z.infer<typeof settingsSchema>,
  outputDir: string,
  onProgress?: (percent: number, stage: string) => void,
): Promise<Buffer> {
  let resultBuffer: Buffer;

  const wantWatermark = settings.removeWatermark;
  const progressScale = (p: number, lo: number, hi: number) =>
    Math.round(lo + (p / 100) * (hi - lo));

  const mattingProgress = wantWatermark
    ? (p: number, s: string) => onProgress?.(progressScale(p, 0, 60), s)
    : onProgress;

  try {
    resultBuffer = await removeBackground(
      inputBuffer,
      outputDir,
      { model: DEFAULT_MODEL },
      mattingProgress,
    );
  } catch (err) {
    const isOom = err instanceof Error && err.message.includes("out of memory");
    if (!isOom) throw err;

    mattingProgress?.(5, `Retrying with fallback model (${FALLBACK_MODEL})`);
    resultBuffer = await removeBackground(
      inputBuffer,
      outputDir,
      { model: FALLBACK_MODEL },
      mattingProgress,
    );
  }

  if (wantWatermark) {
    if (!isToolInstalled("erase-object")) {
      throw new Error("Watermark removal requires the Object Eraser feature bundle");
    }

    onProgress?.(62, "Detecting watermark...");
    const { mask } = await detectWatermarkMask(resultBuffer);

    if (mask) {
      onProgress?.(70, "Removing watermark...");

      const meta = await sharp(resultBuffer).metadata();
      const { data: mattedRaw } = await sharp(resultBuffer)
        .raw()
        .toBuffer({ resolveWithObject: true });
      const w = meta.width!;
      const h = meta.height!;
      const alphaChannel = Buffer.alloc(w * h);
      for (let i = 0; i < w * h; i++) {
        alphaChannel[i] = mattedRaw[i * 4 + 3];
      }

      const rgbBuffer = await sharp(resultBuffer)
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .png()
        .toBuffer();

      const inpaintProgress = (p: number, s: string) => {
        onProgress?.(progressScale(p, 70, 95), s);
      };

      const inpaintedRgb = await inpaint(rgbBuffer, mask, outputDir, inpaintProgress);

      const { data: rgbRaw } = await sharp(inpaintedRgb)
        .raw()
        .toBuffer({ resolveWithObject: true });
      const inpaintedMeta = await sharp(inpaintedRgb).metadata();
      const iw = inpaintedMeta.width!;
      const ih = inpaintedMeta.height!;

      const rgbaData = Buffer.alloc(iw * ih * 4);
      for (let i = 0; i < iw * ih; i++) {
        rgbaData[i * 4] = rgbRaw[i * 3];
        rgbaData[i * 4 + 1] = rgbRaw[i * 3 + 1];
        rgbaData[i * 4 + 2] = rgbRaw[i * 3 + 2];
        rgbaData[i * 4 + 3] = alphaChannel[i] ?? 0;
      }

      resultBuffer = await sharp(rgbaData, {
        raw: { width: iw, height: ih, channels: 4 },
      })
        .png()
        .toBuffer();
    }

    onProgress?.(96, "Finalizing...");
  }

  resultBuffer = await applyDefringe(resultBuffer, settings.defringe);

  if (settings.outputFormat === "webp") {
    resultBuffer = await sharp(resultBuffer).webp({ lossless: true }).toBuffer();
  }

  return resultBuffer;
}

export function registerTransparencyFixer(app: FastifyInstance) {
  app.post(
    "/api/v1/tools/transparency-fixer",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!isToolInstalled(TOOL_ID)) {
        const bundle = getBundleForTool(TOOL_ID);
        return reply.status(501).send({
          error: "Feature not installed",
          code: "FEATURE_NOT_INSTALLED",
          feature: TOOL_BUNDLE_MAP[TOOL_ID],
          featureName: bundle?.name ?? TOOL_ID,
          estimatedSize: bundle?.estimatedSize ?? "unknown",
        });
      }

      let fileBuffer: Buffer | null = null;
      let filename = "image";
      let settingsRaw: string | null = null;
      let clientJobId: string | null = null;

      try {
        const parts = request.parts();
        for await (const part of parts) {
          if (part.type === "file") {
            const chunks: Buffer[] = [];
            for await (const chunk of part.file) chunks.push(chunk);
            fileBuffer = Buffer.concat(chunks);
            filename = sanitizeFilename(part.filename ?? "image");
          } else if (part.fieldname === "settings") {
            settingsRaw = part.value as string;
          } else if (part.fieldname === "clientJobId") {
            const raw = part.value as string;
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
              clientJobId = raw;
            }
          }
        }
      } catch (err) {
        return reply.status(400).send({
          error: "Failed to parse multipart request",
          details: err instanceof Error ? err.message : String(err),
        });
      }

      if (!fileBuffer || fileBuffer.length === 0) {
        return reply.status(400).send({ error: "No image file provided" });
      }

      const validation = await validateImageBuffer(fileBuffer, filename);
      if (!validation.valid) {
        return reply.status(400).send({ error: `Invalid image: ${validation.reason}` });
      }

      let settings: z.infer<typeof settingsSchema>;
      try {
        const parsed = settingsRaw ? JSON.parse(settingsRaw) : {};
        const result = settingsSchema.safeParse(parsed);
        if (!result.success) {
          return reply
            .status(400)
            .send({ error: "Invalid settings", details: formatZodErrors(result.error.issues) });
        }
        settings = result.data;
      } catch {
        return reply.status(400).send({ error: "Settings must be valid JSON" });
      }

      try {
        // Decode HEIC/HEIF before processing
        if (validation.format === "heif") {
          fileBuffer = await decodeHeic(fileBuffer);
          const ext = filename.match(/\.[^.]+$/)?.[0];
          if (ext) filename = `${filename.slice(0, -ext.length)}.png`;
        }

        // Decode CLI-decoded formats (RAW, TGA, PSD, EXR, HDR)
        if (needsCliDecode(validation.format)) {
          fileBuffer = await decodeToSharpCompat(fileBuffer, validation.format);
          const ext = filename.match(/\.[^.]+$/)?.[0];
          if (ext) filename = `${filename.slice(0, -ext.length)}.png`;
        }

        // Auto-orient to fix EXIF rotation
        fileBuffer = await autoOrient(fileBuffer);
      } catch (err) {
        request.log.error({ err, toolId: TOOL_ID }, "Input decoding failed");
        return reply.status(422).send({
          error: "Transparency fix failed",
          details: err instanceof Error ? err.message : "Unknown error",
        });
      }

      const originalSize = fileBuffer.length;
      const jobId = randomUUID();
      const progressJobId = clientJobId || jobId;
      let workspacePath: string;
      try {
        workspacePath = await createWorkspace(jobId);
        const inputPath = join(workspacePath, "input", filename);
        await writeFile(inputPath, fileBuffer);
      } catch (err) {
        request.log.error({ err, toolId: TOOL_ID }, "Workspace creation failed");
        return reply.status(422).send({
          error: "Transparency fix failed",
          details: err instanceof Error ? err.message : "Unknown error",
        });
      }

      const log = request.log;
      log.info(
        { toolId: TOOL_ID, imageSize: originalSize, model: DEFAULT_MODEL },
        "Starting transparency fix",
      );

      // Reply immediately so the HTTP connection closes within proxy timeout limits.
      // The result will be delivered via the SSE progress channel.
      reply.status(202).send({ jobId: progressJobId, async: true });

      const onProgress = (percent: number, stage: string) => {
        updateSingleFileProgress({
          jobId: progressJobId,
          phase: "processing",
          stage,
          percent: Math.min(percent, 95),
        });
      };

      const outputExt = settings.outputFormat === "webp" ? "webp" : "png";

      // Fire-and-forget: processing happens after the response is sent
      (async () => {
        const resultBuffer = await processTransparencyFix(
          fileBuffer,
          settings,
          join(workspacePath, "output"),
          onProgress,
        );

        const outputFilename = `${filename.replace(/\.[^.]+$/, "")}_fixed.${outputExt}`;
        await writeFile(join(workspacePath, "output", outputFilename), resultBuffer);

        const downloadUrl = `/api/v1/download/${jobId}/${encodeURIComponent(outputFilename)}`;

        updateSingleFileProgress({
          jobId: progressJobId,
          phase: "complete",
          percent: 100,
          result: {
            jobId,
            downloadUrl,
            originalSize,
            processedSize: resultBuffer.length,
            filename,
          },
        });

        log.info({ toolId: TOOL_ID, jobId, downloadUrl }, "Transparency fix complete");
      })().catch((err) => {
        log.error({ err, toolId: TOOL_ID }, "Transparency fix failed");
        updateSingleFileProgress({
          jobId: progressJobId,
          phase: "failed",
          percent: 0,
          error: err instanceof Error ? err.message : "Transparency fix failed",
        });
      });
    },
  );

  // Pipeline/batch registry
  registerToolProcessFn({
    toolId: TOOL_ID,
    settingsSchema,
    process: async (inputBuffer, settings, filename) => {
      const s = settings as z.infer<typeof settingsSchema>;
      const orientedBuffer = await autoOrient(inputBuffer);
      const jobId = randomUUID();
      const workspacePath = await createWorkspace(jobId);

      const resultBuffer = await processTransparencyFix(
        orientedBuffer,
        s,
        join(workspacePath, "output"),
      );

      const outputExt = s.outputFormat === "webp" ? "webp" : "png";
      const outputFilename = `${filename.replace(/\.[^.]+$/, "")}_fixed.${outputExt}`;
      const contentType = outputExt === "webp" ? "image/webp" : "image/png";
      return { buffer: resultBuffer, filename: outputFilename, contentType };
    },
  });
}
