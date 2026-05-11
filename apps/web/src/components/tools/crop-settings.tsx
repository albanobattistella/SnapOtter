import { ArrowLeftRight, Download, Grid3x3 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Crop } from "react-image-crop";
import { ProgressCard } from "@/components/common/progress-card";
import { useToolProcessor } from "@/hooks/use-tool-processor";
import { useFileStore } from "@/stores/file-store";

const EXTEND_PRESETS = [
  { label: "16:9", aspect: 16 / 9 },
  { label: "1:1", aspect: 1 },
  { label: "4:3", aspect: 4 / 3 },
  { label: "3:2", aspect: 3 / 2 },
  { label: "9:16", aspect: 9 / 16 },
  { label: "4:5", aspect: 4 / 5 },
];

const ASPECT_PRESETS = [
  { label: "Free", value: undefined as number | undefined },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:2", value: 3 / 2 },
  { label: "16:9", value: 16 / 9 },
  { label: "2:3", value: 2 / 3 },
  { label: "4:5", value: 4 / 5 },
  { label: "9:16", value: 9 / 16 },
];

export interface CropSettingsProps {
  cropState: {
    crop: Crop;
    aspect: number | undefined;
    showGrid: boolean;
    imgDimensions: { width: number; height: number } | null;
  };
  onCropChange: (crop: Crop) => void;
  onAspectChange: (aspect: number | undefined) => void;
  onGridToggle: (show: boolean) => void;
  onModeChange?: (mode: "standard" | "content-aware") => void;
}

export function CropSettings({
  cropState,
  onCropChange,
  onAspectChange,
  onGridToggle,
  onModeChange,
}: CropSettingsProps) {
  const { files } = useFileStore();
  const standardCrop = useToolProcessor("crop");
  const contentAwareCrop = useToolProcessor("content-aware-crop");
  const [mode, setMode] = useState<"standard" | "content-aware">("standard");
  const active = mode === "content-aware" ? contentAwareCrop : standardCrop;
  const { processFiles, processAllFiles, processing, error, downloadUrl, progress } = active;

  const { crop, aspect, showGrid, imgDimensions } = cropState;

  const [customMode, setCustomMode] = useState(false);
  const [customW, setCustomW] = useState("3");
  const [customH, setCustomH] = useState("2");

  // Content-aware extension state
  const [extendTop, setExtendTop] = useState(0);
  const [extendRight, setExtendRight] = useState(0);
  const [extendBottom, setExtendBottom] = useState(0);
  const [extendLeft, setExtendLeft] = useState(0);

  // Notify parent when mode changes
  useEffect(() => {
    onModeChange?.(mode);
  }, [mode, onModeChange]);

  // Convert percentage crop to pixel values
  const toPixels = useCallback(
    (c: Crop) => {
      if (!imgDimensions) return { left: 0, top: 0, width: 0, height: 0 };
      return {
        left: Math.round((c.x / 100) * imgDimensions.width),
        top: Math.round((c.y / 100) * imgDimensions.height),
        width: Math.round((c.width / 100) * imgDimensions.width),
        height: Math.round((c.height / 100) * imgDimensions.height),
      };
    },
    [imgDimensions],
  );

  // Convert pixel value change back to percentage crop
  const handlePixelChange = useCallback(
    (field: "left" | "top" | "width" | "height", value: number) => {
      if (!imgDimensions) return;
      const newCrop = { ...crop };
      if (field === "left") {
        newCrop.x = Math.max(0, Math.min((value / imgDimensions.width) * 100, 100 - newCrop.width));
      } else if (field === "top") {
        newCrop.y = Math.max(
          0,
          Math.min((value / imgDimensions.height) * 100, 100 - newCrop.height),
        );
      } else if (field === "width") {
        const pct = Math.max(0, Math.min((value / imgDimensions.width) * 100, 100 - newCrop.x));
        newCrop.width = pct;
        if (aspect) {
          newCrop.height = Math.min(
            (pct / 100) * imgDimensions.width * (1 / aspect) * (100 / imgDimensions.height),
            100 - newCrop.y,
          );
          newCrop.y = Math.max(0, Math.min(newCrop.y, 100 - newCrop.height));
        }
      } else if (field === "height") {
        const pct = Math.max(0, Math.min((value / imgDimensions.height) * 100, 100 - newCrop.y));
        newCrop.height = pct;
        if (aspect) {
          newCrop.width = Math.min(
            (pct / 100) * imgDimensions.height * aspect * (100 / imgDimensions.width),
            100 - newCrop.x,
          );
          newCrop.x = Math.max(0, Math.min(newCrop.x, 100 - newCrop.width));
        }
      }
      onCropChange(newCrop);
    },
    [crop, imgDimensions, aspect, onCropChange],
  );

  const handleAspectSelect = useCallback(
    (value: number | undefined) => {
      setCustomMode(false);
      onAspectChange(value);
      // When selecting an aspect ratio, adjust the current crop to match
      if (value && imgDimensions) {
        const imgAspect = imgDimensions.width / imgDimensions.height;
        let newWidth: number;
        let newHeight: number;
        if (value > imgAspect) {
          // Desired ratio is wider than image — use full width, shrink height
          newWidth = 100;
          newHeight = (imgDimensions.width / value / imgDimensions.height) * 100;
        } else {
          // Desired ratio is taller than image — use full height, shrink width
          newHeight = 100;
          newWidth = ((imgDimensions.height * value) / imgDimensions.width) * 100;
        }
        onCropChange({
          unit: "%",
          x: (100 - newWidth) / 2,
          y: (100 - newHeight) / 2,
          width: newWidth,
          height: newHeight,
        });
      }
    },
    [onAspectChange, onCropChange, imgDimensions],
  );

  const applyCustomAspect = useCallback(
    (w: number, h: number) => {
      if (w > 0 && h > 0) {
        const value = w / h;
        onAspectChange(value);
        if (imgDimensions) {
          const imgAspect = imgDimensions.width / imgDimensions.height;
          let newWidth: number;
          let newHeight: number;
          if (value > imgAspect) {
            newWidth = 100;
            newHeight = (imgDimensions.width / value / imgDimensions.height) * 100;
          } else {
            newHeight = 100;
            newWidth = ((imgDimensions.height * value) / imgDimensions.width) * 100;
          }
          onCropChange({
            unit: "%",
            x: (100 - newWidth) / 2,
            y: (100 - newHeight) / 2,
            width: newWidth,
            height: newHeight,
          });
        }
      }
    },
    [onAspectChange, onCropChange, imgDimensions],
  );

  const handleCustomSelect = useCallback(() => {
    setCustomMode(true);
    const w = Number(customW);
    const h = Number(customH);
    applyCustomAspect(w, h);
  }, [customW, customH, applyCustomAspect]);

  const handleSwapAspect = useCallback(() => {
    if (aspect) {
      handleAspectSelect(1 / aspect);
    }
  }, [aspect, handleAspectSelect]);

  const pixels = toPixels(crop);

  const handleProcess = () => {
    if (files.length > 1) {
      // Send percentage-based crop so the server adapts to each image's dimensions
      const settings = {
        left: crop.x,
        top: crop.y,
        width: Math.max(0.1, crop.width),
        height: Math.max(0.1, crop.height),
        unit: "percent" as const,
      };
      standardCrop.processAllFiles(files, settings);
    } else {
      const settings = {
        left: pixels.left,
        top: pixels.top,
        width: Math.max(1, pixels.width),
        height: Math.max(1, pixels.height),
      };
      standardCrop.processFiles(files, settings);
    }
  };

  const handleExtendPreset = useCallback(
    (targetAspect: number) => {
      if (!imgDimensions) return;
      const { width: w, height: h } = imgDimensions;
      const currentAspect = w / h;
      let top = 0;
      let right = 0;
      let bottom = 0;
      let left = 0;
      if (targetAspect > currentAspect) {
        // Need wider -- extend left and right
        const newWidth = Math.round(h * targetAspect);
        const extra = newWidth - w;
        left = Math.round(extra / 2);
        right = extra - left;
      } else {
        // Need taller -- extend top and bottom
        const newHeight = Math.round(w / targetAspect);
        const extra = newHeight - h;
        top = Math.round(extra / 2);
        bottom = extra - top;
      }
      setExtendTop(top);
      setExtendRight(right);
      setExtendBottom(bottom);
      setExtendLeft(left);
    },
    [imgDimensions],
  );

  const handleContentAwareProcess = () => {
    const settings = { extendTop, extendRight, extendBottom, extendLeft };
    if (files.length > 1) {
      contentAwareCrop.processAllFiles(files, settings);
    } else {
      contentAwareCrop.processFiles(files, settings);
    }
  };

  const hasFile = files.length > 0;
  const hasSize = pixels.width > 0 && pixels.height > 0;
  const hasExtension = extendTop > 0 || extendRight > 0 || extendBottom > 0 || extendLeft > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "content-aware") {
      if (hasFile && hasExtension && !processing) handleContentAwareProcess();
    } else {
      if (hasFile && hasSize && !processing) handleProcess();
    }
  };

  // Find which preset label matches the current aspect
  const activePresetLabel = ASPECT_PRESETS.find((p) => {
    if (p.value === undefined && aspect === undefined) return true;
    if (p.value !== undefined && aspect !== undefined) {
      return Math.abs(p.value - aspect) < 0.01;
    }
    return false;
  })?.label;

  const canSubmit =
    mode === "content-aware"
      ? hasFile && hasExtension && !processing
      : hasFile && hasSize && !processing;

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-crop-form>
      {/* Mode tabs */}
      <div className="flex gap-1 mb-4">
        <button
          type="button"
          onClick={() => setMode("standard")}
          className={`flex-1 text-xs py-1.5 rounded ${
            mode === "standard"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          Standard
        </button>
        <button
          type="button"
          onClick={() => setMode("content-aware")}
          className={`flex-1 text-xs py-1.5 rounded ${
            mode === "content-aware"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          Content-Aware
        </button>
      </div>

      {/* Standard tab */}
      {mode === "standard" && (
        <>
          {/* Aspect Ratio */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Aspect Ratio</p>
              {aspect !== undefined && (
                <button
                  type="button"
                  onClick={handleSwapAspect}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Swap width/height"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {ASPECT_PRESETS.map(({ label, value }) => (
                <button
                  type="button"
                  key={label}
                  onClick={() => handleAspectSelect(value)}
                  className={`px-2 py-1.5 rounded text-xs transition-colors ${
                    !customMode && activePresetLabel === label
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-primary/20 hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={handleCustomSelect}
                className={`px-2 py-1.5 rounded text-xs transition-colors ${
                  customMode
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-primary/20 hover:text-foreground"
                }`}
              >
                Custom
              </button>
            </div>
            {customMode && (
              <div className="flex items-center gap-1.5 mt-2">
                <input
                  type="number"
                  value={customW}
                  onChange={(e) => {
                    setCustomW(e.target.value);
                    const w = Number(e.target.value);
                    const h = Number(customH);
                    if (w > 0 && h > 0) applyCustomAspect(w, h);
                  }}
                  min={1}
                  className="w-16 px-2 py-1.5 rounded border border-border bg-background text-sm text-foreground tabular-nums text-center"
                />
                <span className="text-xs text-muted-foreground">:</span>
                <input
                  type="number"
                  value={customH}
                  onChange={(e) => {
                    setCustomH(e.target.value);
                    const w = Number(customW);
                    const h = Number(e.target.value);
                    if (w > 0 && h > 0) applyCustomAspect(w, h);
                  }}
                  min={1}
                  className="w-16 px-2 py-1.5 rounded border border-border bg-background text-sm text-foreground tabular-nums text-center"
                />
              </div>
            )}
          </div>

          {/* Position & Size */}
          <div>
            <p className="text-xs text-muted-foreground">Position & Size</p>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div>
                <label htmlFor="crop-x" className="text-[10px] text-muted-foreground">
                  X{imgDimensions ? ` (of ${imgDimensions.width})` : ""}
                </label>
                <input
                  id="crop-x"
                  type="number"
                  value={pixels.left}
                  onChange={(e) => handlePixelChange("left", Number(e.target.value))}
                  min={0}
                  max={imgDimensions ? imgDimensions.width - 1 : undefined}
                  className="w-full mt-0.5 px-2 py-1.5 rounded border border-border bg-background text-sm text-foreground tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="crop-y" className="text-[10px] text-muted-foreground">
                  Y{imgDimensions ? ` (of ${imgDimensions.height})` : ""}
                </label>
                <input
                  id="crop-y"
                  type="number"
                  value={pixels.top}
                  onChange={(e) => handlePixelChange("top", Number(e.target.value))}
                  min={0}
                  max={imgDimensions ? imgDimensions.height - 1 : undefined}
                  className="w-full mt-0.5 px-2 py-1.5 rounded border border-border bg-background text-sm text-foreground tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="crop-width" className="text-[10px] text-muted-foreground">
                  Width{imgDimensions ? ` (of ${imgDimensions.width})` : ""}
                </label>
                <input
                  id="crop-width"
                  type="number"
                  value={pixels.width}
                  onChange={(e) => handlePixelChange("width", Number(e.target.value))}
                  min={1}
                  max={imgDimensions ? imgDimensions.width : undefined}
                  className="w-full mt-0.5 px-2 py-1.5 rounded border border-border bg-background text-sm text-foreground tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="crop-height" className="text-[10px] text-muted-foreground">
                  Height{imgDimensions ? ` (of ${imgDimensions.height})` : ""}
                </label>
                <input
                  id="crop-height"
                  type="number"
                  value={pixels.height}
                  onChange={(e) => handlePixelChange("height", Number(e.target.value))}
                  min={1}
                  max={imgDimensions ? imgDimensions.height : undefined}
                  className="w-full mt-0.5 px-2 py-1.5 rounded border border-border bg-background text-sm text-foreground tabular-nums"
                />
              </div>
            </div>
          </div>

          {/* Grid overlay toggle */}
          <label className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs cursor-pointer select-none text-muted-foreground hover:text-foreground transition-colors">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => onGridToggle(e.target.checked)}
              className="accent-primary h-3.5 w-3.5"
            />
            <Grid3x3 className="h-3.5 w-3.5" />
            Rule of Thirds
          </label>
        </>
      )}

      {/* Content-Aware tab */}
      {mode === "content-aware" && (
        <div className="space-y-4">
          {/* Aspect ratio presets */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Extend to aspect ratio</p>
            <div className="flex flex-wrap gap-1">
              {EXTEND_PRESETS.map(({ label, aspect: a }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleExtendPreset(a)}
                  className="px-2 py-1.5 rounded text-xs bg-muted text-muted-foreground hover:bg-primary/20 hover:text-foreground transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Per-side extension */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Extend by (pixels)</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="extend-top" className="text-[10px] text-muted-foreground">
                  Top
                </label>
                <input
                  id="extend-top"
                  type="number"
                  value={extendTop}
                  onChange={(e) => setExtendTop(Math.max(0, Number(e.target.value)))}
                  min={0}
                  className="w-full mt-0.5 px-2 py-1.5 rounded border border-border bg-background text-sm text-foreground tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="extend-right" className="text-[10px] text-muted-foreground">
                  Right
                </label>
                <input
                  id="extend-right"
                  type="number"
                  value={extendRight}
                  onChange={(e) => setExtendRight(Math.max(0, Number(e.target.value)))}
                  min={0}
                  className="w-full mt-0.5 px-2 py-1.5 rounded border border-border bg-background text-sm text-foreground tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="extend-bottom" className="text-[10px] text-muted-foreground">
                  Bottom
                </label>
                <input
                  id="extend-bottom"
                  type="number"
                  value={extendBottom}
                  onChange={(e) => setExtendBottom(Math.max(0, Number(e.target.value)))}
                  min={0}
                  className="w-full mt-0.5 px-2 py-1.5 rounded border border-border bg-background text-sm text-foreground tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="extend-left" className="text-[10px] text-muted-foreground">
                  Left
                </label>
                <input
                  id="extend-left"
                  type="number"
                  value={extendLeft}
                  onChange={(e) => setExtendLeft(Math.max(0, Number(e.target.value)))}
                  min={0}
                  className="w-full mt-0.5 px-2 py-1.5 rounded border border-border bg-background text-sm text-foreground tabular-nums"
                />
              </div>
            </div>
          </div>

          {/* Output size display */}
          {imgDimensions && (
            <p className="text-xs text-muted-foreground">
              New size: {imgDimensions.width + extendLeft + extendRight} x{" "}
              {imgDimensions.height + extendTop + extendBottom}
            </p>
          )}
        </div>
      )}

      {/* Error */}
      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Process */}
      {processing ? (
        <ProgressCard
          active={processing}
          phase={progress.phase === "idle" ? "uploading" : progress.phase}
          label={mode === "content-aware" ? "Extending" : "Cropping"}
          stage={progress.stage}
          percent={progress.percent}
          elapsed={progress.elapsed}
        />
      ) : (
        <button
          type="submit"
          data-testid="crop-submit"
          disabled={!canSubmit}
          className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {mode === "content-aware"
            ? files.length > 1
              ? `Extend (${files.length} files)`
              : "Extend"
            : files.length > 1
              ? `Crop (${files.length} files)`
              : "Crop"}
        </button>
      )}

      {/* Download */}
      {downloadUrl && (
        <a
          href={downloadUrl}
          download
          data-testid="crop-download"
          className="w-full py-2.5 rounded-lg border border-primary text-primary font-medium flex items-center justify-center gap-2 hover:bg-primary/5"
        >
          <Download className="h-4 w-4" />
          Download
        </a>
      )}
    </form>
  );
}

// ── Pipeline-only crop controls (numeric inputs, no canvas) ──────────

export interface CropControlsProps {
  settings?: Record<string, unknown>;
  onChange?: (settings: Record<string, unknown>) => void;
}

export function CropControls({ settings: initialSettings, onChange }: CropControlsProps) {
  const [left, setLeft] = useState(0);
  const [top, setTop] = useState(0);
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");

  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initialSettings || initializedRef.current) return;
    initializedRef.current = true;
    if (initialSettings.left != null) setLeft(Number(initialSettings.left));
    if (initialSettings.top != null) setTop(Number(initialSettings.top));
    if (initialSettings.width != null) setWidth(String(initialSettings.width));
    if (initialSettings.height != null) setHeight(String(initialSettings.height));
  }, [initialSettings]);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    onChangeRef.current?.({
      left,
      top,
      width: width ? Number(width) : undefined,
      height: height ? Number(height) : undefined,
    });
  }, [left, top, width, height]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="pipeline-crop-left" className="text-xs text-muted-foreground">
            Left offset (px)
          </label>
          <input
            id="pipeline-crop-left"
            type="number"
            value={left}
            onChange={(e) => setLeft(Number(e.target.value))}
            min={0}
            className="w-full mt-0.5 px-2 py-1.5 rounded border border-border bg-background text-sm text-foreground"
          />
        </div>
        <div>
          <label htmlFor="pipeline-crop-top" className="text-xs text-muted-foreground">
            Top offset (px)
          </label>
          <input
            id="pipeline-crop-top"
            type="number"
            value={top}
            onChange={(e) => setTop(Number(e.target.value))}
            min={0}
            className="w-full mt-0.5 px-2 py-1.5 rounded border border-border bg-background text-sm text-foreground"
          />
        </div>
        <div>
          <label htmlFor="pipeline-crop-width" className="text-xs text-muted-foreground">
            Width (px)
          </label>
          <input
            id="pipeline-crop-width"
            type="number"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            min={1}
            placeholder="Required"
            className="w-full mt-0.5 px-2 py-1.5 rounded border border-border bg-background text-sm text-foreground"
          />
        </div>
        <div>
          <label htmlFor="pipeline-crop-height" className="text-xs text-muted-foreground">
            Height (px)
          </label>
          <input
            id="pipeline-crop-height"
            type="number"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            min={1}
            placeholder="Required"
            className="w-full mt-0.5 px-2 py-1.5 rounded border border-border bg-background text-sm text-foreground"
          />
        </div>
      </div>
    </div>
  );
}
