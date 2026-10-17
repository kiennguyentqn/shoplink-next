"use client";

import { ENDPOINTS } from "@/lib/endpoints";
import { useCallback, useEffect, useRef, useState } from "react";
import { secureFetch } from "@/lib/api";
import { copyText } from "@/lib/clipboard";
import {
  DEFAULT_CHAT_ID,
  MAX_VISIBLE_LINKS,
  RUONG_TREO_GROUPS,
  TABS,
  UPSTREAM_ORIGIN,
  type TabKey,
} from "@/lib/constants";
import { isGenuineMobile } from "@/lib/device";
import { formatEndTime, isValidTopic, sendNtfy } from "@/lib/ntfy";
import { decryptLinkPayload } from "@/lib/linkPayload";
import {
  generateUUID,
  getLinkCounter,
  parseCreatedAt,
  parseRatio,
  passesRatioFilter,
} from "@/lib/links";
import {
  fetchInternetTime,
  getLinkExpiry,
  hasTimeSync,
  isLinkExpired,
  nowMs,
} from "@/lib/time";
import type { ChannelsMap, GroupCounts, LinksMap, ViewState } from "@/lib/types";
import DesktopBlocker from "./DesktopBlocker";
import LinkCard from "./LinkCard";
import SettingsModal from "./SettingsModal";
import UnauthorizedView from "./UnauthorizedView";

const MONO = '"SFMono-Regular", Consolas, monospace';

function readJSON<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "") as T;
  } catch {
    return fallback;
  }
}

export default function ShopLinkApp() {
  const [view, setView] = useState<ViewState>("init");
  const [deviceId, setDeviceId] = useState("");
  const [allLinks, setAllLinks] = useState<LinksMap>({});
  const [groupCounts, setGroupCounts] = useState<GroupCounts>({});
  const [channels, setChannels] = useState<ChannelsMap>({});
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("ruong_lon");
  const [search, setSearch] = useState("");
  const [ratioFilter, setRatioFilter] = useState("");
  const [ntfyTopic, setNtfyTopic] = useState("");
  const [interacted, setInteracted] = useState<string[]>([]);
  const [openingKey, setOpeningKey] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [authBadge, setAuthBadge] = useState("");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [toast, setToast] = useState({ msg: "", show: false });
  const [, setTick] = useState(0); // ép render lại mỗi giây cho các đồng hồ đếm ngược

  // Ref để các interval / callback luôn đọc giá trị mới nhất mà không bị stale closure
  const deviceIdRef = useRef("");
  const viewRef = useRef<ViewState>("init");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const changeView = useCallback((v: ViewState) => {
    viewRef.current = v;
    setView(v);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast({ msg, show: true });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(
      () => setToast((t) => ({ ...t, show: false })),
      2500,
    );
  }, []);

  // ==================== TẢI DANH SÁCH LINK ====================
  const fetchLinks = useCallback(
    async (manual = false) => {
      if (manual) {
        setSpinning(true);
        setTimeout(() => setSpinning(false), 600);
      }
      try {
        const { status, data } = await secureFetch(ENDPOINTS.feed, {
          device_id: deviceIdRef.current,
        });
        if (status === 429) return; // rate limit tạm thời -> giữ nguyên màn hình
        if (status === 403) {
          changeView("unauth"); // quyền bị hết hạn / bị xóa
          return;
        }
        if (status === 200 && data && data.success) {
          if (data.need_reload) {
            window.location.reload();
            return;
          }
          setGroupCounts(data.groupCounts || {});
          setChannels(data.channels || {});
          setAllLinks(data.links || {});
          setLoaded(true);
        }
      } catch (err) {
        console.error("Error fetching links:", err);
      }
    },
    [changeView],
  );

  // ==================== KIỂM TRA QUYỀN ====================
  const checkAuth = useCallback(
    async (manual = false) => {
      try {
        const { status, data } = await secureFetch(ENDPOINTS.auth, {
          device_id: deviceIdRef.current,
        });
        if (status === 429) return;

        if (status === 200 && data.authorized) {
          changeView("auth");

          const dev = deviceIdRef.current;
          const devTail = data.device_tail || (dev.length > 4 ? dev.slice(-4) : dev);
          const keyTail =
            data.key_tail ||
            (data.key_code
              ? data.key_code.length > 4
                ? data.key_code.slice(-4)
                : data.key_code
              : "VIP");

          let expFormatted = "--/--/--";
          if (data.expires_at) {
            const d = new Date(data.expires_at);
            const pad = (n: number) => String(n).padStart(2, "0");
            expFormatted = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`;
          }
          setAuthBadge(`...${devTail}-${expFormatted}-...${keyTail}`);
          setExpiresAt(data.expires_at || null);

          await fetchLinks(manual);
          if (manual) showToast("Đã làm mới danh sách!");
        } else if (status === 200 || status === 403) {
          changeView("unauth");
        }
      } catch (err) {
        console.error("Connection error:", err);
      }
    },
    [changeView, fetchLinks, showToast],
  );

  // ==================== KHỞI TẠO ====================
  useEffect(() => {
    // Device ID
    let id = localStorage.getItem("device_id");
    if (!id) {
      id = "device_" + generateUUID();
      localStorage.setItem("device_id", id);
    }
    deviceIdRef.current = id;
    setDeviceId(id);
    setRatioFilter(localStorage.getItem("ratio_filter") || "");
    setNtfyTopic(localStorage.getItem("ntfy_topic") || "");
    setInteracted(readJSON<string[]>("interacted_links", []));

    // Đồng hồ đếm ngược + giờ chuẩn internet
    const tickId = setInterval(() => setTick((t) => t + 1), 1000);
    const syncTime = async () => {
      const first = !hasTimeSync();
      const ok = await fetchInternetTime();
      if (ok && first) setTick((t) => t + 1); // vẽ lại để dùng giờ chuẩn
    };
    syncTime();
    const syncId = setInterval(syncTime, 5 * 60000);

    if (!isGenuineMobile()) {
      changeView("blocked");
      return () => {
        clearInterval(tickId);
        clearInterval(syncId);
      };
    }

    checkAuth();

    // Tự động cập nhật link mới mỗi 3 giây (ngừng poll khi tắt màn hình)
    const pollId = setInterval(() => {
      if (document.hidden) return;
      if (!isGenuineMobile()) {
        changeView("blocked");
        return;
      }
      if (viewRef.current === "auth") fetchLinks();
      else if (viewRef.current !== "blocked") checkAuth();
    }, 3000);

    return () => {
      clearInterval(tickId);
      clearInterval(syncId);
      clearInterval(pollId);
    };
  }, [changeView, checkAuth, fetchLinks]);

  // ==================== HÀNH ĐỘNG ====================
  const markInteracted = useCallback((key: string) => {
    setInteracted((prev) => {
      if (prev.includes(key)) return prev;
      const next = [...prev, key];
      try {
        localStorage.setItem("interacted_links", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  async function openDeeplink(key: string) {
    if (!isGenuineMobile()) {
      showToast("Chỉ hỗ trợ mở link trên thiết bị di động!");
      return;
    }
    setOpeningKey(key);
    try {
      const { ok, data } = await secureFetch(ENDPOINTS.claim, {
        device_id: deviceIdRef.current,
        shop_id: key,
      });

      if (ok && (data.url || data.payload || data.redirect_token)) {
        markInteracted(key);

        // Gửi giờ kết thúc qua ntfy (chỉ khi đã lưu ID phòng)
        if (ntfyTopic) {
          const exp = getLinkExpiry(allLinks[key], key);
          if (exp) await sendNtfy(ntfyTopic, formatEndTime(exp));
        }

        let targetUrl: string | undefined = data.url;
        if (!targetUrl && data.payload && data.t) {
          try {
            targetUrl = await decryptLinkPayload(
              data.payload,
              deviceIdRef.current,
              key,
              data.t,
            );
          } catch (e) {
            console.warn("Decrypt failed, fallback to token", e);
          }
        }

        if (targetUrl) window.location.href = targetUrl;
        else if (data.redirect_token)
          window.location.href = `${UPSTREAM_ORIGIN}/r/${data.redirect_token}`;
      } else {
        showToast(data.error || "Link không khả dụng hoặc hết hạn!");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!");
    } finally {
      setOpeningKey(null);
    }
  }

  async function copyShortLink(key: string) {
    const ok = await copyText(`${window.location.origin}/${key}`);
    showToast(ok ? "Đã sao chép link chuyển tiếp!" : "Lỗi sao chép link!");
    markInteracted(key);
  }

  async function copyDeviceId() {
    const ok = await copyText(deviceIdRef.current);
    showToast(ok ? "Đã sao chép ID thiết bị!" : "Lỗi copy, vui lòng copy thủ công.");
  }

  function saveSettings(newId: string, newRatio: string, newTopic: string): string | null {
    if (!newId) {
      showToast("Device ID không được để trống!");
      return "empty";
    }
    if (newRatio !== "" && parseRatio(newRatio) === null) {
      showToast("Ratio phải là số, VD: 1.5");
      return "ratio";
    }

    if (newTopic !== "" && !isValidTopic(newTopic)) {
      showToast("ID ntfy chỉ gồm chữ, số, - và _ (tối đa 64 ký tự)");
      return "ntfy";
    }

    setNtfyTopic(newTopic);
    if (newTopic === "") localStorage.removeItem("ntfy_topic");
    else localStorage.setItem("ntfy_topic", newTopic);

    setRatioFilter(newRatio);
    if (newRatio === "") localStorage.removeItem("ratio_filter");
    else localStorage.setItem("ratio_filter", newRatio);

    const idChanged = newId !== deviceIdRef.current;
    if (idChanged) {
      deviceIdRef.current = newId;
      localStorage.setItem("device_id", newId);
      setDeviceId(newId);
      setAllLinks({});
      setGroupCounts({});
      setLoaded(false);
    }

    setSettingsOpen(false);
    if (idChanged) checkAuth(true);
    showToast("Đã lưu cài đặt!");
    return null;
  }

  function switchTab(key: TabKey) {
    setActiveTab(key);
    setSearch("");
  }

  // ==================== DỮ LIỆU HIỂN THỊ ====================
  const filtering = parseRatio(ratioFilter) !== null;

  const expectedChatId = String(
    channels[activeTab]?.chat_id || DEFAULT_CHAT_ID[activeTab] || activeTab,
  );
  const isTreoGroup =
    activeTab === "ruong_treo" && RUONG_TREO_GROUPS.includes(expectedChatId);

  const keys = Object.keys(allLinks)
    .filter((key) => {
      const itemGroup = allLinks[key].group ? String(allLinks[key].group) : "";
      // Rương treo nhận cả 853 lẫn 740 để chuyển đổi mượt; tab khác chỉ nhận đúng chat id
      if (isTreoGroup) return RUONG_TREO_GROUPS.includes(itemGroup);
      return itemGroup === expectedChatId;
    })
    .filter((key) => activeTab !== "ruong_lon" || passesRatioFilter(allLinks[key], ratioFilter))
    .filter((key) => !isLinkExpired(allLinks[key], key))
    .sort((a, b) => {
      const tb = parseCreatedAt(allLinks[b].created_at);
      const ta = parseCreatedAt(allLinks[a].created_at);
      if (tb !== ta) return tb - ta; // mới nhất lên đầu
      return getLinkCounter(b) - getLinkCounter(a);
    });

  const countBadge = isTreoGroup
    ? Math.max(groupCounts[RUONG_TREO_GROUPS[0]] || 0, groupCounts[RUONG_TREO_GROUPS[1]] || 0)
    : groupCounts[expectedChatId] ?? 0;

  // Chỉ hiển thị tối đa 20 link mới nhất để tối ưu hiệu năng
  const term = search.toLowerCase().trim();
  const visibleKeys = keys
    .slice(0, MAX_VISIBLE_LINKS)
    .filter((k) => !term || k.toLowerCase().includes(term));

  const now = nowMs();
  const synced = hasTimeSync();

  // Đồng hồ hạn dùng của thiết bị
  let cdText = "⏳ Vĩnh viễn";
  let cdColor = "var(--tiktok-cyan)";
  let cdBorder = "rgba(37, 244, 238, 0.3)";
  if (expiresAt) {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) {
      cdText = "⚠️ Hết hạn";
      cdColor = "#ef4444";
      cdBorder = "rgba(239, 68, 68, 0.4)";
    } else {
      const total = Math.floor(diff / 1000);
      const days = Math.floor(total / 86400);
      const pad = (n: number) => String(n).padStart(2, "0");
      const hms = `${pad(Math.floor((total % 86400) / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
      cdText = days > 0 ? `⏳ Còn: ${days}d ${hms}` : `⏳ Còn: ${hms}`;
      cdColor = "#ff7a00";
      cdBorder = "rgba(255, 122, 0, 0.25)";
    }
  }

  // ==================== RENDER ====================
  return (
    <>
      {view === "blocked" && <DesktopBlocker />}

      {view === "unauth" && (
        <UnauthorizedView
          deviceId={deviceId}
          filtering={filtering}
          onCopyDeviceId={copyDeviceId}
          onOpenSettings={() => setSettingsOpen(true)}
          onActivated={() => checkAuth()}
          showToast={showToast}
        />
      )}

      {view === "auth" && (
        <div id="authorizedView" className="admin-container" style={{ maxWidth: 680 }}>
          <div
            className="admin-header"
            style={{
              marginBottom: 20,
              paddingBottom: 15,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div className="admin-title-group">
              <h1
                style={{
                  fontSize: 24,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontWeight: 800,
                  background: "linear-gradient(45deg, #ff7a00, #fe2c55, #25f4ee)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Link TikTok
                <span className="badge-live" style={{ WebkitTextFillColor: "initial" }}>
                  Live
                </span>
                <span
                  style={{
                    WebkitTextFillColor: "initial",
                    fontSize: 13,
                    background: "rgba(255, 122, 0, 0.15)",
                    color: "#ff7a00",
                    padding: "2px 8px",
                    borderRadius: 6,
                    fontWeight: 700,
                    border: "1px solid rgba(255, 122, 0, 0.25)",
                  }}
                >
                  {countBadge}
                </span>
              </h1>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <div
                title="4 số cuối máy - Ngày hết hạn - 4 số cuối Key"
                style={{
                  fontFamily: MONO,
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#fff",
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  padding: "3px 8px",
                  borderRadius: 6,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span style={{ color: "var(--tiktok-cyan)" }}>●</span>
                <span>{authBadge}</span>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: cdColor,
                  fontFamily: MONO,
                  background: "rgba(255, 122, 0, 0.1)",
                  padding: "3px 8px",
                  borderRadius: 6,
                  border: `1px solid ${cdBorder}`,
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                {cdText}
              </span>
              <button
                className="refresh-btn"
                onClick={() => checkAuth(true)}
                title="Làm mới"
                style={{ padding: 4 }}
              >
                <svg
                  className={`refresh-icon${spinning ? " spinning" : ""}`}
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
              </button>
              <button
                type="button"
                className={`settings-fab${filtering ? " filtering" : ""}`}
                onClick={() => setSettingsOpen(true)}
                title="Cài đặt"
              >
                ⚙️<span className="dot"></span>
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <input
              type="text"
              id="searchInput"
              className="form-input"
              placeholder="Tìm kiếm link..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 12,
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                color: "#fff",
                fontSize: 13,
                outline: "none",
                transition: "all 0.3s",
              }}
            />
          </div>

          <div className="tabs-container">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`tab-btn${activeTab === t.key ? " active" : ""}`}
                onClick={() => switchTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div id="linksList" className="links-container">
            {!loaded ? (
              <p className="description" style={{ textAlign: "center" }}>
                Đang tải danh sách link...
              </p>
            ) : keys.length === 0 ? (
              <p className="description" style={{ textAlign: "center", margin: "40px 0" }}>
                Chưa có link nào trong phân loại này.
              </p>
            ) : (
              visibleKeys.map((key, idx) => (
                <LinkCard
                  key={key}
                  linkKey={key}
                  item={allLinks[key]}
                  expMs={getLinkExpiry(allLinks[key], key)}
                  now={now}
                  hasTimeSync={synced}
                  interacted={interacted.includes(key)}
                  opening={openingKey === key}
                  delay={idx * 0.05}
                  onOpen={openDeeplink}
                  onCopy={copyShortLink}
                />
              ))
            )}
          </div>
        </div>
      )}

      <SettingsModal
        open={settingsOpen}
        deviceId={deviceId}
        ratioFilter={ratioFilter}
        ntfyTopic={ntfyTopic}
        onClose={() => setSettingsOpen(false)}
        onSave={saveSettings}
      />

      <div id="toast" className={`toast${toast.show ? " show" : ""}`}>
        {toast.msg}
      </div>
    </>
  );
}
