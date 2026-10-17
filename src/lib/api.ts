import { decryptJSON, encryptJSON } from "@/lib/crypto";

export interface SecureResponse<T = any> {
  status: number;
  ok: boolean;
  data: T;
}

/**
 * Gọi API nội bộ (/api/...) với body & response đều được mã hóa AES-GCM.
 * Dạng truyền tải: { "d": "<base64(iv + ciphertext)>" }
 * Ném lỗi khi mạng hỏng hoặc không giải mã được (sai khóa, server trả lỗi thô...).
 */
export async function secureFetch<T = any>(
  path: string,
  body: Record<string, unknown>,
): Promise<SecureResponse<T>> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ d: await encryptJSON(body) }),
  });

  const json = await res.json(); // lỗi thô (HTML/500) sẽ ném ở đây
  if (!json || typeof json.d !== "string") {
    throw new Error("Phản hồi không đúng định dạng mã hóa");
  }
  const data = await decryptJSON<T>(json.d);
  return { status: res.status, ok: res.ok, data };
}
