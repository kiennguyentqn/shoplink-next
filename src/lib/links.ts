import type { LinkItem } from "./types";

export function parseRatio(v: unknown): number | null {
  const n = parseFloat(
    String(v ?? "")
      .replace(",", ".")
      .replace(/[^0-9.\-]/g, ""),
  );
  return isNaN(n) ? null : n;
}

export function passesRatioFilter(item: LinkItem, ratioFilter: string): boolean {
  const min = parseRatio(ratioFilter);
  if (min === null) return true; // không lọc
  const r = parseRatio(item && item.ratio);
  return r !== null && r >= min;
}

/** "HH:MM:SS DD/MM/YY" -> timestamp */
export function parseCreatedAt(str?: string): number {
  if (!str) return 0;
  const parts = str.split(" ");
  const timeParts = (parts[0] || "").split(":");
  const dateParts = (parts[1] || "").split("/");
  const h = parseInt(timeParts[0], 10) || 0;
  const m = parseInt(timeParts[1], 10) || 0;
  const s = parseInt(timeParts[2], 10) || 0;
  const dd = parseInt(dateParts[0], 10) || 1;
  const mm = parseInt(dateParts[1], 10) - 1 || 0;
  let yy = parseInt(dateParts[2], 10) || 0;
  if (yy < 100) yy += 2000;
  return new Date(yy, mm, dd, h, m, s).getTime();
}

/** Lấy số thứ tự đứng sau chữ "link" ở cuối key */
export function getLinkCounter(key: string): number {
  const idx = key.lastIndexOf("link");
  if (idx !== -1) return parseInt(key.slice(idx + 4), 10) || 0;
  return 0;
}

export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
