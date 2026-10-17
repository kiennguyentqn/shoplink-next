"use client";

import { ENDPOINTS } from "@/lib/endpoints";
import { FormEvent, useState } from "react";
import { secureFetch } from "@/lib/api";

interface Props {
  deviceId: string;
  filtering: boolean;
  onCopyDeviceId: () => void;
  onOpenSettings: () => void;
  onActivated: () => Promise<void> | void;
  showToast: (msg: string) => void;
}

export default function UnauthorizedView({
  deviceId,
  filtering,
  onCopyDeviceId,
  onOpenSettings,
  onActivated,
  showToast,
}: Props) {
  const [keyValue, setKeyValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const key = keyValue.trim().toUpperCase();
    if (!key) {
      setError("Vui lòng nhập mã Key!");
      return;
    }
    if (key.startsWith("DEVICE_") || key === (deviceId || "").toUpperCase()) {
      setError(
        "⚠️ Đây là Mã Thiết Bị của bạn, không phải Mã Key! Vui lòng nhập mã Key bạn đã mua.",
      );
      return;
    }

    setError("");
    setLoading(true);
    try {
      const { ok, data } = await secureFetch(ENDPOINTS.activate, {
        key,
        device_id: deviceId,
      });
      if (ok && data.success) {
        showToast(data.message || "🎉 Kích hoạt thành công!");
        setKeyValue("");
        await onActivated();
      } else {
        setError(data.error || "Mã Key không chính xác hoặc đã hết lượt dùng!");
      }
    } catch {
      setError("Lỗi kết nối máy chủ, vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div id="unauthorizedView" className="container" style={{ maxWidth: 500 }}>
      <div className="logo-container">
        <div className="logo">ShopLink</div>
      </div>

      <div className="status-box" style={{ marginBottom: 20 }}>
        <div className="status-badge unauthorized animate-pulse-slow">
          Chưa Cấp Phép
        </div>
        <p className="description" style={{ marginBottom: 0 }}>
          Thiết bị của bạn chưa được cấp quyền truy cập. Bạn có thể kích hoạt
          nhanh bằng <b>Mã Key</b> hoặc gửi ID thiết bị cho Admin:
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: 15, width: "100%" }}>
          <div style={{ textAlign: "left", marginBottom: 6 }}>
            <label
              htmlFor="clientKeyInput"
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              🔑 Nhập Mã Key Kích Hoạt:
            </label>
          </div>
          <div style={{ display: "flex", gap: 8, width: "100%" }}>
            <input
              type="text"
              id="clientKeyInput"
              className="form-input"
              placeholder="VD: VIP-8A2B-X7K1-9M4P"
              required
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              style={{
                flex: 1,
                height: 42,
                fontSize: 13.5,
                fontFamily: '"SFMono-Regular", Consolas, monospace',
                fontWeight: 700,
                textTransform: "uppercase",
                background: "rgba(0, 0, 0, 0.5)",
                borderColor: "rgba(37, 244, 238, 0.35)",
                color: "#25f4ee",
              }}
            />
            <button
              type="submit"
              id="clientActivateBtn"
              className="btn-submit"
              disabled={loading}
              style={{
                height: 42,
                padding: "0 16px",
                fontSize: 13,
                fontWeight: 700,
                whiteSpace: "nowrap",
                width: "auto",
                background: "linear-gradient(45deg, #ff7a00, #fe2c55, #25f4ee)",
                boxShadow: "0 4px 15px rgba(255, 122, 0, 0.3)",
              }}
            >
              {loading ? "⏳ Đang kích hoạt..." : "⚡ Kích Hoạt"}
            </button>
          </div>
          {error && (
            <div
              style={{
                color: "#ef4444",
                fontSize: 12,
                marginTop: 8,
                textAlign: "left",
              }}
            >
              {error}
            </div>
          )}
        </form>

        <div
          style={{
            margin: "15px 0 10px 0",
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
          }}
        >
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
          <span style={{ fontSize: 11, color: "#888", textTransform: "uppercase" }}>
            Mã Thiết Bị Của Bạn
          </span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
        </div>

        <div className="device-id-container">
          <span
            className="device-id"
            onClick={onCopyDeviceId}
            style={{ cursor: "pointer" }}
            title="Nhấp để sao chép"
          >
            {deviceId || "device_..."}
          </span>
          <button className="copy-btn" onClick={onCopyDeviceId}>
            Sao chép
          </button>
        </div>
        <button
          type="button"
          className={`settings-fab with-label${filtering ? " filtering" : ""}`}
          onClick={onOpenSettings}
        >
          ⚙️ Cài đặt Device ID<span className="dot"></span>
        </button>
      </div>
    </div>
  );
}
