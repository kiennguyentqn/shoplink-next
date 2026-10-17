export const TABS = [
  { key: "ruong_lon", label: "Rương lớn" },
  { key: "ruong_nho", label: "Rương nhỏ" },
  { key: "ruong_treo", label: "Rương treo" },
  { key: "ruong_test", label: "Rương Test" },
  { key: "tui", label: "Túi" },
  { key: "tui_0xu", label: "Túi 0xu" },
] as const;

export type TabKey = (typeof TABS)[number]["key"];

/** Chat ID mặc định khi backend chưa trả cấu hình channels */
export const DEFAULT_CHAT_ID: Record<TabKey, string> = {
  ruong_treo: "-1003874158853",
  ruong_lon: "-1002889993912",
  ruong_nho: "-1003606511380",
  ruong_test: "-1003393920142",
  tui: "-1002601067327",
  tui_0xu: "-1003337128065",
};

/** Rương treo nhận cả 2 nhóm cũ/mới để chuyển đổi mượt */
export const RUONG_TREO_GROUPS = ["-1003874158853", "-1002914600740"];

export const MAX_VISIBLE_LINKS = 20;

export const UPSTREAM_ORIGIN = (
  process.env.NEXT_PUBLIC_UPSTREAM_ORIGIN || ""
).replace(/\/$/, "");
