import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { decryptJSON, encryptJSON } from "@/lib/crypto";

const UPSTREAM = (
  process.env.UPSTREAM_API_URL || "https://vohoainam.net"
).replace(/\/$/, "");

// Header giả lập Android — mọi request server gửi lên backend đều dùng bộ này,
// bất kể người dùng thật đang dùng thiết bị gì. Có thể ghi đè UA bằng biến ANDROID_UA.
const ANDROID_UA =
  process.env.ANDROID_UA ||
  "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.122 Mobile Safari/537.36";

const ANDROID_HEADERS: Record<string, string> = {
  "User-Agent": ANDROID_UA,
  "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
  "sec-ch-ua": '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
};

const SHIELD_SECRET =
  process.env.SHIELD_SECRET || "ShopLink_Shield_v2_9f8d2e4a7c1b5062";

/** Đọc & giải mã body { d } do client gửi lên. Trả về null nếu sai định dạng / sai khóa. */
export async function readSecureBody<T = Record<string, any>>(
  req: NextRequest,
): Promise<T | null> {
  try {
    const json = await req.json();
    if (!json || typeof json.d !== "string") return null;
    return await decryptJSON<T>(json.d);
  } catch {
    return null;
  }
}

/** Trả response đã mã hóa: { d } */
export async function secureJson(status: number, data: unknown) {
  const d = await encryptJSON(data);
  return NextResponse.json(
    { d },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

/** Chữ ký request gửi lên backend (trước đây tính ở client). */
export function signRequest(deviceId: string, ts: number): string {
  return createHash("sha256")
    .update(`${deviceId}:${ts}:${SHIELD_SECRET}`)
    .digest("hex");
}

/** Gọi backend gốc; luôn trả { status, json } (không ném lỗi). */
export async function callUpstream(
  req: NextRequest,
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; json: any }> {
  const headers = new Headers(init.headers);
  // Luôn gửi header kiểu Android (không chuyển tiếp User-Agent thật của client)
  for (const [k, v] of Object.entries(ANDROID_HEADERS)) headers.set(k, v);
  // Chỉ chuyển tiếp IP để backend rate-limit đúng người
  const xff = req.headers.get("x-forwarded-for");
  if (xff) headers.set("x-forwarded-for", xff);

  try {
    const res = await fetch(UPSTREAM + path, {
      ...init,
      headers,
      cache: "no-store",
    });
    let json: any = {};
    try {
      json = await res.json();
    } catch {}
    return { status: res.status, json };
  } catch {
    return { status: 502, json: { error: "Lỗi kết nối máy chủ!" } };
  }
}

export const BAD_REQUEST = { error: "Yêu cầu không hợp lệ" };
