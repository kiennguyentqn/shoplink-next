function fallbackCopy(text: string): boolean {
  try {
    const isIOS = /ipad|ipod|iphone/i.test(navigator.userAgent);
    let el: HTMLElement;

    if (isIOS) {
      el = document.createElement("span");
      el.textContent = text;
      Object.assign(el.style, {
        position: "absolute",
        left: "-9999px",
        top: "-9999px",
        whiteSpace: "pre",
        userSelect: "text",
      });
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      Object.assign(ta.style, {
        position: "fixed",
        left: "-9999px",
        top: "-9999px",
      });
      el = ta;
    }

    document.body.appendChild(el);

    if (isIOS) {
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    } else {
      (el as HTMLTextAreaElement).select();
    }

    const ok = document.execCommand("copy");
    if (isIOS) window.getSelection()?.removeAllRanges();
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

/** Trả true nếu copy thành công */
export async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* rơi xuống fallback */
    }
  }
  return fallbackCopy(text);
}
