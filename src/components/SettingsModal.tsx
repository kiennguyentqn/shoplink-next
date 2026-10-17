"use client";

import { useEffect, useState } from "react";

interface Props {
  open: boolean;
  deviceId: string;
  ratioFilter: string;
  ntfyTopic: string;
  onClose: () => void;
  /** Trả về chuỗi lỗi (hiện toast) hoặc null nếu lưu thành công */
  onSave: (deviceId: string, ratio: string, ntfyTopic: string) => string | null;
}

export default function SettingsModal({
  open,
  deviceId,
  ratioFilter,
  ntfyTopic,
  onClose,
  onSave,
}: Props) {
  const [id, setId] = useState(deviceId);
  const [ratio, setRatio] = useState(ratioFilter);
  const [topic, setTopic] = useState(ntfyTopic);

  // Mỗi lần mở modal thì nạp lại giá trị hiện tại
  useEffect(() => {
    if (open) {
      setId(deviceId);
      setRatio(ratioFilter);
      setTopic(ntfyTopic);
    }
  }, [open, deviceId, ratioFilter, ntfyTopic]);

  if (!open) return null;

  return (
    <div
      className="settings-backdrop"
      style={{ display: "flex" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="settings-modal">
        <h3>⚙️ Cài đặt</h3>
        <label htmlFor="settingsDeviceId">Device ID</label>
        <input
          type="text"
          id="settingsDeviceId"
          placeholder="device_xxxxxxxx-xxxx-..."
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          value={id}
          onChange={(e) => setId(e.target.value)}
        />
        <div className="hint">
          Lưu vào localStorage với key <b>device_id</b>.
        </div>
        <label htmlFor="settingsRatio">
          Lọc Ratio — chỉ áp dụng cho Rương lớn (hiện link có ratio &ge; giá trị
          này)
        </label>
        <input
          type="text"
          id="settingsRatio"
          inputMode="decimal"
          placeholder="VD: 1.5 (để trống = hiện tất cả)"
          autoComplete="off"
          value={ratio}
          onChange={(e) => setRatio(e.target.value)}
        />
        <div className="hint">Link không có ratio sẽ bị ẩn khi đang bật lọc.</div>
        <label htmlFor="settingsNtfy">ID phòng chat ntfy (ntfy.sh)</label>
        <input
          type="text"
          id="settingsNtfy"
          placeholder="VD: shoplink-abc123 (để trống = tắt)"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <div className="hint">
          Khi bấm Mở Link, giờ kết thúc (VD 17:50:42) sẽ được gửi tới phòng này.
          Chỉ gửi khi đã lưu ID.
        </div>
        <div className="settings-actions">
          <button type="button" className="settings-cancel" onClick={onClose}>
            Hủy
          </button>
          <button
            type="button"
            className="settings-save"
            onClick={() => onSave(id.trim(), ratio.trim(), topic.trim())}
          >
            💾 Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
