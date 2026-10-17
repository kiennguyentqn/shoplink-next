/**
 * Tiện ích mã hóa / giải mã AES-GCM
 * Dùng Web Crypto API — hoạt động cả server (Node 18+) lẫn browser.
 *
 * Khóa được đọc từ biến môi trường:
 *   - Server-only:  CRYPTO_SECRET
 *   - Client-side:  NEXT_PUBLIC_CRYPTO_KEY  (nhúng vào bundle)
 *
 * Ưu tiên CRYPTO_SECRET (server) → NEXT_PUBLIC_CRYPTO_KEY (client) → fallback.
 */

const ALGO = "AES-GCM";
const IV_LENGTH = 12; // 96-bit IV, chuẩn cho GCM
const FALLBACK_SECRET = "shoplink-insecure-fallback-secret-change-me";

function getSecret(): string {
  // Lưu ý: phải viết nguyên văn process.env.NEXT_PUBLIC_* để Next nhúng vào bundle client.
  return (
    process.env.CRYPTO_SECRET ||
    process.env.NEXT_PUBLIC_CRYPTO_KEY ||
    FALLBACK_SECRET
  );
}

let keyPromise: Promise<CryptoKey> | null = null;

/** Khóa AES-256 = SHA-256(secret). Cache lại để không phải dẫn xuất mỗi lần. */
function getKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    const subtle = globalThis.crypto.subtle;
    keyPromise = (async () => {
      const raw = new TextEncoder().encode(getSecret());
      const digest = await subtle.digest("SHA-256", raw);
      return subtle.importKey("raw", digest, { name: ALGO }, false, [
        "encrypt",
        "decrypt",
      ]);
    })().catch((e) => {
      keyPromise = null;
      throw e;
    });
  }
  return keyPromise;
}

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Mã hóa chuỗi -> base64( IV(12 byte) + ciphertext + authTag ) */
export async function encryptText(plain: string): Promise<string> {
  const key = await getKey();
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const cipher = await globalThis.crypto.subtle.encrypt(
    { name: ALGO, iv: iv as BufferSource },
    key,
    new TextEncoder().encode(plain),
  );
  const out = new Uint8Array(IV_LENGTH + cipher.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(cipher), IV_LENGTH);
  return toBase64(out);
}

/** Giải mã chuỗi base64 do encryptText tạo ra. Ném lỗi nếu sai khóa / bị sửa dữ liệu. */
export async function decryptText(b64: string): Promise<string> {
  const key = await getKey();
  const bytes = fromBase64(b64);
  if (bytes.length <= IV_LENGTH) throw new Error("Payload không hợp lệ");
  const iv = bytes.slice(0, IV_LENGTH);
  const data = bytes.slice(IV_LENGTH);
  const plain = await globalThis.crypto.subtle.decrypt(
    { name: ALGO, iv: iv as BufferSource },
    key,
    data as BufferSource,
  );
  return new TextDecoder().decode(plain);
}

export async function encryptJSON(value: unknown): Promise<string> {
  return encryptText(JSON.stringify(value));
}

export async function decryptJSON<T = any>(b64: string): Promise<T> {
  return JSON.parse(await decryptText(b64)) as T;
}
