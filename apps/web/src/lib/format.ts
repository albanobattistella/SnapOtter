export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`));
}

export function plural(count: number, one: string, other: string): string {
  return count === 1 ? one : other;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function formatDate(date: Date | string, locale: string): string {
  return new Date(date).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | string, locale: string): string {
  const d = new Date(date);
  return `${d.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" })} ${d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}`;
}
