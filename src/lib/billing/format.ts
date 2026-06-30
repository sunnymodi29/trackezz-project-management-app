export function formatStorageBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function formatLimit(
  value: number | null,
  unit: "members" | "messages" | "storage",
): string {
  if (value == null) return "Unlimited";
  if (unit === "storage") return formatStorageBytes(value);
  return String(value);
}
