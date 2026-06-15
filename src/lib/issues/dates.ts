/** Normalize dates that may be Date or ISO string after JSON/cache hydration. */
export function coerceDate(value: Date | string | undefined | null): Date | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function dateFromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export function isPastDay(date: Date): boolean {
  const today = startOfDay(new Date());
  return startOfDay(date).getTime() < today.getTime();
}

export function formatDateDisplay(value: Date | string | null | undefined): string {
  const d =
    typeof value === "string"
      ? value
        ? dateFromKey(value)
        : null
      : coerceDate(value);
  if (!d) return "";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function isDateKeyInRange(
  key: string,
  min?: string,
  max?: string,
): boolean {
  if (min && key < min) return false;
  if (max && key > max) return false;
  return true;
}
