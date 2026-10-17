/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Đưa DEVICE_GUARD (không có tiền tố NEXT_PUBLIC_) xuống client lúc build,
  // để hàm isGenuineMobile() đọc được ở trình duyệt.
  env: {
    DEVICE_GUARD: process.env.DEVICE_GUARD ?? "0",
  },
  async headers() {
    return [
      {
        // Tương đương 3 thẻ <meta> no-cache của index.html cũ (chỉ áp dụng cho trang chủ)
        source: "/",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
    ];
  },
};

export default nextConfig;
