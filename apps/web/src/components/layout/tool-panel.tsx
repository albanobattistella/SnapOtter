import { CATEGORIES, MODALITIES, TOOLS } from "@snapotter/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/contexts/i18n-context";
import { useFuseSearch } from "@/hooks/use-fuse-search";
import { ICON_MAP } from "@/lib/icon-map";
import { getCategoryName, getModalityName } from "@/lib/tool-i18n";
import { useFeaturesStore } from "@/stores/features-store";
import { useSettingsStore } from "@/stores/settings-store";
import { SearchBar } from "../common/search-bar";
import { ToolCard } from "../common/tool-card";

export function ToolPanel() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const { disabledTools, experimentalEnabled, loaded, fetch } = useSettingsStore();
  const fetchFeatures = useFeaturesStore((s) => s.fetch);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  const visibleTools = useMemo(() => {
    if (!loaded) return [];
    return TOOLS.filter((t) => {
      if (disabledTools.includes(t.id)) return false;
      if (t.experimental && !experimentalEnabled) return false;
      return true;
    });
  }, [disabledTools, experimentalEnabled, loaded]);

  const filteredTools = useFuseSearch(visibleTools, search);

  const groupedByModality = useMemo(() => {
    const byModality = new Map<string, Map<string, typeof TOOLS>>();
    for (const tool of filteredTools) {
      const key = tool.modality === "file" ? "document" : tool.modality;
      const cats = byModality.get(key) ?? new Map<string, typeof TOOLS>();
      const list = cats.get(tool.category) ?? [];
      list.push(tool);
      cats.set(tool.category, list);
      byModality.set(key, cats);
    }
    return byModality;
  }, [filteredTools]);

  return (
    <div className="w-72 border-r border-border bg-background overflow-y-auto flex flex-col shrink-0">
      <div className="p-3 sticky top-0 bg-background z-10">
        <SearchBar value={search} onChange={setSearch} />
      </div>
      <div className="px-3 pb-4 flex-1">
        {MODALITIES.filter((m) => m.id !== "file" && groupedByModality.has(m.id)).map(
          (modality, idx, arr) => {
            const ModalityIcon = ICON_MAP[modality.icon] as React.ComponentType<{
              className?: string;
            }>;
            const categoryMap = groupedByModality.get(modality.id);
            if (!categoryMap) return null;
            const isLast = idx === arr.length - 1;
            return (
              <div key={modality.id} className={isLast ? "" : "mb-2"}>
                {idx > 0 && <hr className="border-border mb-4" />}
                <div
                  className="flex items-center gap-2 mt-4 mb-3 pl-2.5 border-l-[3px] rounded-sm"
                  style={{ borderColor: modality.color }}
                >
                  {ModalityIcon && (
                    <span className="shrink-0" style={{ color: modality.color }}>
                      <ModalityIcon className="h-4.5 w-4.5" />
                    </span>
                  )}
                  <h2 className="text-sm font-semibold text-foreground tracking-wide">
                    {getModalityName(
                      t,
                      modality.id,
                      modality.id === "document" ? "Documents & Files" : modality.name,
                    )}
                  </h2>
                </div>
                {CATEGORIES.filter((cat) => categoryMap.has(cat.id)).map((category) => (
                  <div key={category.id} className="mb-3">
                    <h3 className="text-xs font-medium text-muted-foreground tracking-wider mb-1.5 pl-1">
                      {getCategoryName(t, category.id, category.name)}
                    </h3>
                    <div className="space-y-0.5">
                      {categoryMap.get(category.id)?.map((tool) => (
                        <ToolCard key={tool.id} tool={tool} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          },
        )}
        {filteredTools.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No tools found</p>
        )}
      </div>
    </div>
  );
}
