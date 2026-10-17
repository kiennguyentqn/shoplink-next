/**
 * Kiểm tra thiết bị di động thật (chặn PC, MacOS, F12 DevTools giả lập).
 *
 *   NEXT_PUBLIC_DEBUG_LINK=1 -> chạy toàn bộ bộ kiểm tra bên dưới
 *   NEXT_PUBLIC_DEBUG_LINK=0 -> luôn trả về true
 */
export function isGenuineMobile(): boolean {
  if (process.env.NEXT_PUBLIC_DEBUG_LINK !== "1") return true;
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return true; // SSR: chưa có gì để kiểm tra
  }

  const ua = (navigator.userAgent || "").toLowerCase();
  const platform = (navigator.platform || "").toLowerCase();

  // 1. Kiểm tra User-Agent cơ bản
  const isMobileUA =
    /android|iphone|ipad|ipod|windows phone|iemobile|mobile/i.test(ua);
  if (!isMobileUA) {
    return false; // Chắc chắn là PC/Mac thông thường
  }

  // 2. Chặn F12 DevTools giả lập trên Windows/Mac/Linux
  // Khi F12 trên PC giả lập iPhone/Android: navigator.platform VẪN là Win32, Win64, MacIntel, Linux x86_64
  const isWin = platform.includes("win");
  const isLinuxPC =
    platform.includes("linux x86") ||
    platform.includes("linux i686") ||
    platform === "linux x86_64";
  const isMacPC =
    platform.includes("macintel") &&
    !("ontouchend" in document) &&
    (navigator.maxTouchPoints || 0) === 0;
  if (isWin || isLinuxPC || isMacPC) {
    return false; // 100% là máy tính Windows/Linux/Mac bật F12 giả lập
  }

  // 3. Kiểm tra Touch Points & Touch Events
  const touchPoints =
    navigator.maxTouchPoints || (navigator as any).msMaxTouchPoints || 0;
  const hasTouch = "ontouchstart" in window || touchPoints > 0;
  if (!hasTouch || touchPoints === 0) {
    return false; // Máy tính dùng chuột, không có cảm ứng của điện thoại thật
  }

  // 4. Kiểm tra độ phân giải màn hình thật (Screen vs Viewport)
  // Khi F12 bật giả lập: screen.width/availWidth là kích thước màn hình PC (1920, 1366, 2560...), trong khi innerWidth là 430
  const screenW = window.screen.width || 0;
  const availW = window.screen.availWidth || 0;
  const innerW = window.innerWidth || 0;
  // Điện thoại thật có screen.width CSS chỉ 320px - 500px (kể cả tablet lớn nhất cũng dưới 1024px)
  if ((screenW > 1000 || availW > 1000) && innerW <= 600) {
    return false; // 100% là F12 DevTools trên màn hình máy tính
  }

  // 5. Kiểm tra Card đồ họa WebGL (GPU Unmasked Renderer)
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (gl) {
      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        const renderer = String(
          gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "",
        ).toLowerCase();
        // GPU máy tính để bàn/laptop: NVIDIA GeForce, AMD Radeon, Intel UHD/HD/Iris Graphics, ANGLE Direct3D...
        const isDesktopGPU =
          /nvidia|geforce|rtx|gtx|radeon|direct3d|intel\(r\)|iris|uhd graphics|hd graphics|mesa/i.test(
            renderer,
          );
        // Điện thoại thật dùng: Apple GPU, Adreno, Mali, PowerVR, Xclipse, Immortalis
        if (isDesktopGPU) {
          return false; // 100% là GPU máy tính chạy F12 giả lập
        }
      }
    }
  } catch (e) {}

  // 6. Kiểm tra chênh lệch outerWidth vs innerWidth khi mở DevTools panel
  if (window.outerWidth && window.innerWidth) {
    const widthDiff = window.outerWidth - window.innerWidth;
    if (widthDiff > 160 && window.innerWidth < 600) {
      return false;
    }
  }

  return true; // Thiết bị di động thật
}
