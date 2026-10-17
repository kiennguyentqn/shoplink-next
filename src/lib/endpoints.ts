/**
 * Tên route nội bộ (giả) mà client gọi — cố tình KHÁC tên API thật của backend.
 * Muốn đổi tên: đổi value ở đây VÀ đổi tên thư mục tương ứng trong src/app/api/.
 *
 *   ping   -> backend: /api/check-auth
 *   redeem -> backend: /api/activate-key
 *   items  -> backend: /api/v2/feed/stream
 *   go     -> backend: /api/v2/feed/claim-link
 */
export const ENDPOINTS = {
  auth: "/api/ping",
  activate: "/api/redeem",
  feed: "/api/items",
  claim: "/api/go",
} as const;
