import type { Tool } from "@snapotter/shared";
import { MODALITIES, PYTHON_SIDECAR_TOOLS, TOOL_BUNDLE_MAP } from "@snapotter/shared";
import { Clock, Download, FileImage, Loader2, Star } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "@/contexts/i18n-context";
import { ICON_MAP } from "@/lib/icon-map";
import { getToolDescription, getToolName } from "@/lib/tool-i18n";
import { cn } from "@/lib/utils";
import { useFeaturesStore } from "@/stores/features-store";

interface ToolCardProps {
  tool: Tool;
  variant?: "compact" | "descriptive";
  showModalityBadge?: boolean;
}

const MODALITY_COLOR_MAP: Record<string, string> = Object.fromEntries(
  MODALITIES.map((m) => [m.id, m.color]),
);

export function ToolCard({ tool, variant = "compact", showModalityBadge }: ToolCardProps) {
  const { t } = useTranslation();
  const IconComponent =
    (ICON_MAP[tool.icon] as React.ComponentType<{ className?: string }>) ?? FileImage;

  const isAiTool = (PYTHON_SIDECAR_TOOLS as readonly string[]).includes(tool.id);
  const bundles = useFeaturesStore((s) => s.bundles);
  const installing = useFeaturesStore((s) => s.installing);
  const queued = useFeaturesStore((s) => s.queued);
  const aiStatus = useMemo(() => {
    if (!isAiTool) return "installed";
    const bundleId = TOOL_BUNDLE_MAP[tool.id];
    if (!bundleId) return "installed";
    if (queued.includes(bundleId)) return "queued";
    if (installing[bundleId]) return "installing";
    const bundle = bundles.find((b) => b.id === bundleId);
    return bundle?.status === "installed" ? "installed" : "not_installed";
  }, [isAiTool, tool.id, bundles, installing, queued]);

  const modalityBadge = showModalityBadge ? (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
      style={{
        backgroundColor: `${MODALITY_COLOR_MAP[tool.modality] ?? "#6B7280"}20`,
        color: MODALITY_COLOR_MAP[tool.modality] ?? "#6B7280",
      }}
    >
      {MODALITIES.find((m) => m.id === tool.modality)?.name ?? tool.modality}
    </span>
  ) : null;

  const aiStatusIcon =
    aiStatus === "not_installed" ? (
      <>
        <Download className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">{t.a11y.notInstalled}</span>
      </>
    ) : aiStatus === "queued" ? (
      <>
        <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">{t.a11y.queued}</span>
      </>
    ) : aiStatus === "installing" ? (
      <>
        <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" aria-hidden="true" />
        <span className="sr-only">{t.a11y.installing}</span>
      </>
    ) : null;

  if (variant === "descriptive") {
    return (
      <Link
        to={tool.route}
        className={cn(
          "flex items-center gap-3 py-2.5 px-3 rounded-lg w-full transition-colors",
          "hover:bg-muted",
          tool.disabled && "opacity-50 pointer-events-none",
        )}
      >
        <div className="p-2 rounded-md bg-muted shrink-0">
          <IconComponent className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {getToolName(t, tool.id, tool.name)}
            </span>
            {modalityBadge}
            {tool.experimental && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 font-medium">
                {t.common.experimental}
              </span>
            )}
            {aiStatusIcon}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {getToolDescription(t, tool.id, tool.description)}
          </p>
        </div>
      </Link>
    );
  }

  return (
    <div className="group flex items-center gap-3 relative">
      <button
        type="button"
        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity absolute -left-7 p-2"
        title={t.toolCard.addToFavourites}
        aria-label={t.toolCard.addToFavourites}
      >
        <Star className="h-3 w-3 text-muted-foreground hover:text-yellow-500" />
      </button>
      <Link
        to={tool.route}
        className={cn(
          "flex items-center gap-3 py-2 px-3 rounded-lg w-full transition-colors",
          "hover:bg-muted",
          tool.disabled && "opacity-50 pointer-events-none",
        )}
      >
        <IconComponent className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">
          {getToolName(t, tool.id, tool.name)}
        </span>
        {modalityBadge}
        {tool.experimental && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 font-medium">
            {t.common.experimental}
          </span>
        )}
        {aiStatusIcon}
      </Link>
    </div>
  );
}
