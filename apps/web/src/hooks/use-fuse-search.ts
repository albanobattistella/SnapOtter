import type { Tool } from "@snapotter/shared";
import type { IFuseOptions } from "fuse.js";
import Fuse from "fuse.js";
import { useMemo } from "react";

const FUSE_OPTIONS: IFuseOptions<Tool> = {
  keys: [
    { name: "name", weight: 0.4 },
    { name: "description", weight: 0.3 },
    { name: "id", weight: 0.2 },
    { name: "category", weight: 0.1 },
  ],
  threshold: 0.4,
  ignoreLocation: true,
  minMatchCharLength: 2,
};

/**
 * Wraps a tool list with Fuse.js fuzzy search.
 * Returns all tools when query is empty; ranked fuzzy results otherwise.
 */
export function useFuseSearch(tools: Tool[], query: string): Tool[] {
  const fuse = useMemo(() => new Fuse(tools, FUSE_OPTIONS), [tools]);

  return useMemo(() => {
    if (!query) return tools;
    return fuse.search(query).map((r) => r.item);
  }, [fuse, query, tools]);
}
