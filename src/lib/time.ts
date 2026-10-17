import type { LinkItem } from "./types";

// Giờ chuẩn lấy từ internet (không dùng đồng hồ máy). Sau mỗi lần đồng bộ, thời gian chạy tiếp
// bằng performance.now() (đồng hồ đơn điệu, đổi giờ máy cũng không ảnh hưởng).
let timeSync: { server: number; perf: number } | null = null;

// Giờ trong trường time của link là giờ Việt Nam (UTC+7)
const SERVER_TZ_OFFSET_H = 7;

export function hasTimeSync(): boolean {
  return timeSync !== null;
}

export function nowMs(): number {
  return timeSync
    ? timeSync.server + (performance.now() - timeSync.perf)
    : Date.now(); // tạm dùng giờ máy cho tới khi đồng bộ xong
}

const TIME_SOURCES: { url: string; parse: (r: Response) => Promise<number> }[] =
  [
    {
      url: "https://worldtimeapi.org/api/timezone/Etc/UTC",
      parse: async (r) => {
        const j = await r.json();
        const t = new Date(
          String(j.datetime).replace(/(\.\d{3})\d+/, "$1"),
        ).getTime();
        return isNaN(t) ? j.unixtime * 1000 : t;
      },
    },
    {
      url: "https://timeapi.io/api/Time/current/zone?timeZone=UTC",
      parse: async (r) => {
        const j = await r.json();
        return new Date(
          String(j.dateTime).replace(/(\.\d{3})\d+/, "$1") + "Z",
        ).getTime();
      },
    },
    {
      url: "https://www.cloudflare.com/cdn-cgi/trace",
      parse: async (r) => {
        const m = (await r.text()).match(/ts=([\d.]+)/);
        return m ? parseFloat(m[1]) * 1000 : NaN;
      },
    },
  ];

/** Trả true nếu đồng bộ thành công */
export async function fetchInternetTime(): Promise<boolean> {
  for (const src of TIME_SOURCES) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 4000);
    try {
      const t0 = performance.now();
      const res = await fetch(src.url, { cache: "no-store", signal: ctl.signal });
      const t1 = performance.now();
      const serverMs = await src.parse(res);
      clearTimeout(timer);
      if (!res.ok || !isFinite(serverMs)) continue;
      // Bù một nửa độ trễ mạng
      timeSync = { server: serverMs + (t1 - t0) / 2, perf: t1 };
      return true;
    } catch {
      clearTimeout(timer);
    }
  }
  console.warn("Không lấy được giờ từ internet, tạm dùng giờ máy.");
  return false;
}

// ---- Cache giờ hết hạn theo từng link: tính 1 lần, lưu localStorage để tải lại trang không bị reset ----
let expiryCache: Record<string, number> | null = null;

function loadCache(): Record<string, number> {
  if (expiryCache) return expiryCache;
  try {
    const c = JSON.parse(localStorage.getItem("link_expiry_v2") || "{}");
    const limit = Date.now() - 3600000; // bỏ các link đã hết hạn quá 1 giờ
    Object.keys(c).forEach((k) => {
      if (c[k] < limit) delete c[k];
    });
    expiryCache = c;
  } catch {
    expiryCache = {};
  }
  return expiryCache!;
}

// item.time dạng "01:00s - 10:32:20": thời lượng 01:00 (mm:ss) - giờ bắt đầu 10:32:20.
// Hết hạn = giờ bắt đầu + thời lượng.
function computeLinkExpiry(item: LinkItem): number | null {
  const m = String((item && item.time) || "").match(
    /(\d+):(\d{2})\s*s?\s*-\s*(\d{1,2}):(\d{2}):(\d{2})/,
  );
  if (!m) return null;
  const durSec = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  const tz = SERVER_TZ_OFFSET_H * 3600000;
  const now = nowMs();
  const vn = new Date(now + tz); // đọc các trường UTC = giờ VN
  let startMs =
    Date.UTC(
      vn.getUTCFullYear(),
      vn.getUTCMonth(),
      vn.getUTCDate(),
      parseInt(m[3], 10),
      parseInt(m[4], 10),
      parseInt(m[5], 10),
    ) - tz;
  // Chỉ coi là hôm qua khi giờ bắt đầu lớn hơn hiện tại rất nhiều (qua nửa đêm)
  if (startMs > now + 30 * 60000) startMs -= 86400000;
  // Không bao giờ vượt quá thời lượng gốc
  return Math.min(startMs + durSec * 1000, now + durSec * 1000);
}

export function getLinkExpiry(item: LinkItem, key: string): number | null {
  const cache = loadCache();
  const ck = key + "|" + ((item && item.time) || "");
  if (cache[ck] !== undefined) return cache[ck];
  const exp = computeLinkExpiry(item);
  if (exp !== null && timeSync) {
    cache[ck] = exp;
    try {
      localStorage.setItem("link_expiry_v2", JSON.stringify(cache));
    } catch {}
  }
  return exp;
}

/** Chỉ xét khi đã có giờ internet để không xóa nhầm do lệch giờ máy */
export function isLinkExpired(item: LinkItem, key: string): boolean {
  if (!timeSync) return false;
  const exp = getLinkExpiry(item, key);
  return exp !== null && exp <= nowMs();
}

export function formatRemaining(diffMs: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const total = Math.max(0, Math.floor(diffMs / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
