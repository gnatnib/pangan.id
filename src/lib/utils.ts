// Utility functions for Pangan.id

/**
 * Format a number as Indonesian Rupiah.
 * Example: 15750 -> "Rp 15.750"
 */
export function formatRupiah(value: number): string {
  if (value === null || value === undefined || isNaN(value)) return "-";
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

/**
 * Format a number as compact Rupiah (for mobile/cards).
 * Example: 15750 -> "15.750"
 */
export function formatPrice(value: number): string {
  if (value === null || value === undefined || isNaN(value)) return "-";
  return Math.round(value).toLocaleString("id-ID");
}

/**
 * Format percentage change.
 * Example: 2.5 -> "+2,50%", -1.3 -> "-1,30%"
 */
export function formatPct(value: number | null): string {
  if (value === null || value === undefined || isNaN(value)) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2).replace(".", ",")}%`;
}

/**
 * Format absolute change with sign.
 * Example: 500 -> "+Rp 500", -300 -> "-Rp 300"
 */
export function formatChange(value: number | null): string {
  if (value === null || value === undefined || isNaN(value)) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}Rp ${Math.abs(Math.round(value)).toLocaleString("id-ID")}`;
}

/**
 * Format a date string to Indonesian locale.
 * Example: "2026-02-27" -> "Kamis, 27 Februari 2026"
 */
export function formatDateLong(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format a date string to short format.
 * Example: "2026-02-27" -> "27 Feb 2026"
 */
export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Get today's date as YYYY-MM-DD string.
 */
export function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Get a date N days ago as YYYY-MM-DD string.
 */
export function getDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

/**
 * Determine the CSS class for price change direction.
 */
export function getPriceChangeColor(value: number | null): string {
  if (value === null || value === undefined || value === 0) return "text-neutral-500";
  return value > 0 ? "text-red-600" : "text-emerald-600";
}

/**
 * Get the arrow indicator for price change.
 */
export function getPriceChangeArrow(value: number | null): string {
  if (value === null || value === undefined || value === 0) return "→";
  return value > 0 ? "↑" : "↓";
}

/**
 * Determine the bg class for commodity category.
 */
export function getCategoryColor(category: string | null): string {
  const map: Record<string, string> = {
    "Beras": "bg-amber-50 text-amber-700",
    "Bumbu": "bg-purple-50 text-purple-700",
    "Cabai": "bg-red-50 text-red-700",
    "Daging": "bg-rose-50 text-rose-700",
    "Telur": "bg-yellow-50 text-yellow-700",
    "Minyak Goreng": "bg-orange-50 text-orange-700",
    "Gula": "bg-pink-50 text-pink-700",
  };
  return map[category || ""] || "bg-gray-50 text-gray-700";
}

/**
 * Calculate percentage difference between two values.
 */
export function calcPctDiff(current: number, reference: number): number {
  if (reference === 0) return 0;
  return ((current - reference) / reference) * 100;
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
