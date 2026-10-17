export default function DesktopBlocker() {
  return (
    <div
      id="desktopBlocker"
      className="container"
      style={{ textAlign: "center", padding: "40px 20px" }}
    >
      <div className="logo-container">
        <div
          className="logo"
          style={{
            background: "linear-gradient(45deg, #ff2c55, #ff7a00, #25f4ee)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          ShopLink
        </div>
      </div>
      <div className="status-box" style={{ borderColor: "rgba(254, 44, 85, 0.3)" }}>
        <div
          className="status-badge unauthorized"
          style={{
            background: "rgba(254, 44, 85, 0.1)",
            color: "#fe2c55",
            borderColor: "rgba(254, 44, 85, 0.25)",
          }}
        >
          TRUY CẬP BỊ CHẶN
        </div>
        <h2
          style={{ color: "#fff", marginTop: 20, fontSize: 18, fontWeight: 700 }}
        >
          Thiết bị không hỗ trợ
        </h2>
        <p
          className="description"
          style={{
            marginTop: 10,
            fontSize: 13,
            lineHeight: 1.6,
            color: "var(--text-secondary)",
          }}
        >
          Hệ thống chỉ hỗ trợ truy cập trực tiếp trên <b>thiết bị di động</b>{" "}
          (Zalo, Messenger, Điện thoại).
        </p>
      </div>
      <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 20 }}>
        Mọi hành vi giả lập thiết bị trên máy tính đều bị từ chối truy cập để bảo
        mật link.
      </p>
    </div>
  );
}
