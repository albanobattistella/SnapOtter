import { describe, expect, it } from "vitest";
import { formatZodErrors, stripInternalPaths } from "../../../apps/api/src/lib/errors.js";

describe("formatZodErrors", () => {
  it("formats single issue with path", () => {
    const result = formatZodErrors([
      { path: ["width"], message: "Must be positive", code: "custom" },
    ]);
    expect(result).toBe("width: Must be positive");
  });

  it("formats single issue without path", () => {
    const result = formatZodErrors([{ path: [], message: "Invalid input", code: "custom" }]);
    expect(result).toBe("Invalid input");
  });

  it("joins multiple issues with semicolons", () => {
    const result = formatZodErrors([
      { path: ["width"], message: "Required", code: "custom" },
      { path: ["height"], message: "Must be positive", code: "custom" },
    ]);
    expect(result).toBe("width: Required; height: Must be positive");
  });

  it("returns empty string for empty array", () => {
    const result = formatZodErrors([]);
    expect(result).toBe("");
  });

  it("joins nested paths with dots", () => {
    const result = formatZodErrors([
      { path: ["settings", "quality"], message: "Too high", code: "custom" },
    ]);
    expect(result).toBe("settings.quality: Too high");
  });
});

describe("stripInternalPaths", () => {
  it("strips /tmp scratch paths", () => {
    const msg = "ENOENT: no such file or directory, open '/tmp/workspace/abc123/input.png'";
    expect(stripInternalPaths(msg)).toBe("ENOENT: no such file or directory, open '[internal]'");
  });

  it("strips /data/ai/venv Python traceback paths", () => {
    const msg = 'File "/data/ai/venv/lib/python3.11/site-packages/rembg/bg.py", line 42, in remove';
    expect(stripInternalPaths(msg)).toBe('File "[internal]", line 42, in remove');
  });

  it("strips /app container paths", () => {
    const msg = "Error loading model from /app/models/realesrgan-x4.pth";
    expect(stripInternalPaths(msg)).toBe("Error loading model from [internal]");
  });

  it("strips /opt paths", () => {
    const msg = "Cannot find /opt/libreoffice/program/soffice";
    expect(stripInternalPaths(msg)).toBe("Cannot find [internal]");
  });

  it("strips /home paths", () => {
    const msg = "Permission denied: /home/node/.cache/sharp";
    expect(stripInternalPaths(msg)).toBe("Permission denied: [internal]");
  });

  it("strips /workspace paths", () => {
    const msg = "failed at /workspace/snapotter/packages/image-engine/src/convert.ts:42";
    expect(stripInternalPaths(msg)).toBe("failed at [internal]");
  });

  it("strips multiple paths in one message", () => {
    const msg = "cp: /tmp/scratch/a.png -> /data/output/b.png failed";
    expect(stripInternalPaths(msg)).toBe("cp: [internal] -> [internal] failed");
  });

  it("leaves safe messages untouched", () => {
    const msg = "Invalid image format: expected PNG or JPEG";
    expect(stripInternalPaths(msg)).toBe(msg);
  });

  it("leaves timeout messages untouched", () => {
    const msg = "Timed out after 120s";
    expect(stripInternalPaths(msg)).toBe(msg);
  });

  it("handles pipeline step error wrapping", () => {
    const msg = "Step 2: Command failed: /tmp/workspace/job123/ffmpeg -i /data/input.mp4";
    const result = stripInternalPaths(msg);
    expect(result).not.toContain("/tmp/");
    expect(result).not.toContain("/data/");
    expect(result).toBe("Step 2: Command failed: [internal] -i [internal]");
  });
});
