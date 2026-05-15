import type { TranslationKeys } from "@snapotter/shared";

export function getToolName(t: TranslationKeys, toolId: string, fallback: string): string {
  const entry = (t.tools as Record<string, { name?: string }>)[toolId];
  return entry?.name ?? fallback;
}

export function getToolDescription(t: TranslationKeys, toolId: string, fallback: string): string {
  const entry = (t.tools as Record<string, { description?: string }>)[toolId];
  return entry?.description ?? fallback;
}

export function getCategoryName(t: TranslationKeys, categoryId: string, fallback: string): string {
  return (t.categories as Record<string, string>)[categoryId] ?? fallback;
}
