export interface LinkItem {
  group?: string | number;
  created_at: string; // "HH:MM:SS DD/MM/YY"
  time?: string; // "01:00s - 10:32:20"
  tt_id?: string | number;
  box_bag?: string | number;
  ratio?: string | number;
  live?: string | number;
}

export type LinksMap = Record<string, LinkItem>;
export type ChannelsMap = Record<string, { chat_id?: string | number }>;
export type GroupCounts = Record<string, number>;
export type ViewState = "init" | "blocked" | "unauth" | "auth";
