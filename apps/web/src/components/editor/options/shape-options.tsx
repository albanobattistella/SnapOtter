// apps/web/src/components/editor/options/shape-options.tsx

import { useTranslation } from "@/contexts/i18n-context";
import { useEditorStore } from "@/stores/editor-store";
import type { StrokeDashStyle, ToolType } from "@/types/editor";
import { ShapeColorPicker } from "../common/shape-color-picker";

const SHAPE_TOOLS = new Set<ToolType>([
  "shape-rect",
  "shape-ellipse",
  "shape-line",
  "shape-arrow",
  "shape-polygon",
  "shape-star",
]);

export function ShapeOptions() {
  const { t } = useTranslation();
  const s = t.editor.shapes;

  const activeTool = useEditorStore((st) => st.activeTool);
  const setTool = useEditorStore((st) => st.setTool);
  const shapeFill = useEditorStore((st) => st.shapeFill);
  const shapeFillOpacity = useEditorStore((st) => st.shapeFillOpacity);
  const shapeStroke = useEditorStore((st) => st.shapeStroke);
  const shapeStrokeOpacity = useEditorStore((st) => st.shapeStrokeOpacity);
  const shapeStrokeWidth = useEditorStore((st) => st.shapeStrokeWidth);
  const shapeStrokeDash = useEditorStore((st) => st.shapeStrokeDash);
  const shapeCornerRadius = useEditorStore((st) => st.shapeCornerRadius);
  const shapePolygonSides = useEditorStore((st) => st.shapePolygonSides);
  const shapeStarPoints = useEditorStore((st) => st.shapeStarPoints);
  const setShapeFill = useEditorStore((st) => st.setShapeFill);
  const setShapeFillOpacity = useEditorStore((st) => st.setShapeFillOpacity);
  const setShapeStroke = useEditorStore((st) => st.setShapeStroke);
  const setShapeStrokeOpacity = useEditorStore((st) => st.setShapeStrokeOpacity);
  const setShapeStrokeWidth = useEditorStore((st) => st.setShapeStrokeWidth);
  const setShapeStrokeDash = useEditorStore((st) => st.setShapeStrokeDash);
  const setShapeCornerRadius = useEditorStore((st) => st.setShapeCornerRadius);
  const setShapePolygonSides = useEditorStore((st) => st.setShapePolygonSides);
  const setShapeStarPoints = useEditorStore((st) => st.setShapeStarPoints);

  if (!SHAPE_TOOLS.has(activeTool)) return null;

  const SHAPE_TYPE_OPTIONS: { value: ToolType; label: string }[] = [
    { value: "shape-rect", label: s.rectangle },
    { value: "shape-ellipse", label: s.ellipse },
    { value: "shape-line", label: s.line },
    { value: "shape-arrow", label: s.arrow },
    { value: "shape-polygon", label: s.polygon },
    { value: "shape-star", label: s.star },
  ];

  const showFill = activeTool !== "shape-line";

  return (
    <div className="flex items-center gap-3">
      {/* Shape type selector */}
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {s.shape}
        <select
          value={activeTool}
          onChange={(e) => setTool(e.target.value as ToolType)}
          className="h-6 text-xs bg-muted border border-border rounded px-1"
        >
          {SHAPE_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      {/* Fill color */}
      {showFill && (
        <ShapeColorPicker
          label={s.fill}
          color={shapeFill}
          opacity={shapeFillOpacity}
          onColorChange={setShapeFill}
          onOpacityChange={setShapeFillOpacity}
        />
      )}

      {/* Stroke color */}
      <ShapeColorPicker
        label={s.stroke}
        color={shapeStroke}
        opacity={shapeStrokeOpacity}
        onColorChange={setShapeStroke}
        onOpacityChange={setShapeStrokeOpacity}
      />

      {/* Stroke width */}
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {s.strokeWidth}
        <input
          type="range"
          min={0}
          max={50}
          value={shapeStrokeWidth}
          onChange={(e) => setShapeStrokeWidth(Number(e.target.value))}
          className="w-16"
        />
        <input
          type="number"
          min={0}
          max={50}
          value={shapeStrokeWidth}
          onChange={(e) => setShapeStrokeWidth(Number(e.target.value))}
          className="w-10 h-6 text-xs text-center bg-muted border border-border rounded px-1"
        />
      </label>

      {/* Stroke dash style */}
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {s.dashStyle}
        <select
          value={shapeStrokeDash}
          onChange={(e) => setShapeStrokeDash(e.target.value as StrokeDashStyle)}
          className="h-6 text-xs bg-muted border border-border rounded px-1"
        >
          <option value="solid">{s.solid}</option>
          <option value="dashed">{s.dashed}</option>
          <option value="dotted">{s.dotted}</option>
        </select>
      </label>

      {/* Corner radius (only for rect) */}
      {activeTool === "shape-rect" && (
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {s.cornerRadius}
          <input
            type="range"
            min={0}
            max={100}
            value={shapeCornerRadius}
            onChange={(e) => setShapeCornerRadius(Number(e.target.value))}
            className="w-16"
          />
          <input
            type="number"
            min={0}
            max={100}
            value={shapeCornerRadius}
            onChange={(e) => setShapeCornerRadius(Number(e.target.value))}
            className="w-10 h-6 text-xs text-center bg-muted border border-border rounded px-1"
          />
        </label>
      )}

      {/* Polygon sides */}
      {activeTool === "shape-polygon" && (
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {s.sides}
          <input
            type="number"
            min={3}
            max={20}
            value={shapePolygonSides}
            onChange={(e) => setShapePolygonSides(Number(e.target.value))}
            className="w-12 h-6 text-xs text-center bg-muted border border-border rounded px-1"
          />
        </label>
      )}

      {/* Star points */}
      {activeTool === "shape-star" && (
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {s.points}
          <input
            type="number"
            min={3}
            max={20}
            value={shapeStarPoints}
            onChange={(e) => setShapeStarPoints(Number(e.target.value))}
            className="w-12 h-6 text-xs text-center bg-muted border border-border rounded px-1"
          />
        </label>
      )}
    </div>
  );
}
