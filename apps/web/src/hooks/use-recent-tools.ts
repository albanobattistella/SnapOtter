import { useSyncExternalStore } from "react";

const STORAGE_KEY = "snapotter-recent-tools";
const MAX_RECENT = 5;
const EMPTY: string[] = [];

let listeners: Array<() => void> = [];
let cachedRaw: string | null = null;
let cachedParsed: string[] = EMPTY;

function getSnapshot(): string[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedParsed = raw ? JSON.parse(raw) : EMPTY;
    } catch {
      cachedParsed = EMPTY;
    }
  }
  return cachedParsed;
}

function getServerSnapshot(): string[] {
  return EMPTY;
}

function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function recordRecentTool(toolId: string) {
  const current = getSnapshot();
  const updated = [toolId, ...current.filter((id) => id !== toolId)].slice(0, MAX_RECENT);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  cachedRaw = null;
  for (const l of listeners) l();
}

export function useRecentTools(): string[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
