/**
 * Giải mã payload link TikTok mà backend trả về (XOR theo seed thiết bị) —
 * giữ nguyên thuật toán cũ để tương thích backend hiện tại.
 */
export async function decryptLinkPayload(
  b64: string,
  devId: string,
  shopId: string,
  ts: string | number,
): Promise<string> {
  const seed = `${devId}:${shopId}:${ts}:VT_ANTI_LEAK_99X`;
  const hashBuf = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(seed),
  );
  const key = new Uint8Array(hashBuf);

  const binaryStr = atob(b64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i) ^ key[i % key.length] ^ ((i * 37) & 0xff);
  }
  return new TextDecoder().decode(bytes);
}
