const TOPIC_RE = /^[A-Za-z0-9_-]{1,64}$/;

export function isValidTopic(topic: string): boolean {
  return TOPIC_RE.test(topic);
}

/** Giờ kết thúc theo giờ Việt Nam (UTC+7), dạng "17:50:42" */
export function formatEndTime(expMs: number): string {
  const d = new Date(expMs + 7 * 3600000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

/**
 * Gửi tin tới https://ntfy.sh/<topic>. Không bao giờ ném lỗi và chờ tối đa 1.5s
 * để không làm chậm việc mở link.
 */
export async function sendNtfy(topic: string, message: string): Promise<void> {
  if (!isValidTopic(topic)) return;
  try {
    await Promise.race([
      fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, {
        method: "POST",
        body: message, // text/plain -> request đơn giản, không cần preflight
        keepalive: true,
      }),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
  } catch {
    /* bỏ qua lỗi ntfy */
  }
}
