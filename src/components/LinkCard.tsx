"use client";

import { useEffect, useRef, useState } from "react";
import { formatRemaining } from "@/lib/time";
import type { LinkItem } from "@/lib/types";

interface Props {
  linkKey: string;
  item: LinkItem;
  expMs: number | null;
  now: number;
  hasTimeSync: boolean;
  interacted: boolean;
  opening: boolean;
  delay: number;
  onOpen: (key: string) => void;
  onCopy: (key: string) => void;
}

export default function LinkCard({
  linkKey,
  item,
  expMs,
  now,
  hasTimeSync,
  interacted,
  opening,
  delay,
  onOpen,
  onCopy,
}: Props) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const [hours = "", date = ""] = (item.created_at || "").split(" ");

  let timeText = hours;
  let timeColor: string | undefined;
  if (expMs) {
    const diff = expMs - now;
    timeText = diff <= 0 && !hasTimeSync ? "00:00" : formatRemaining(diff);
    if (diff < 60000) timeColor = "#ef4444";
  }

  function handleCopy() {
    onCopy(linkKey);
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  }

  const hasDetails =
    item.tt_id || item.box_bag || item.ratio || item.live || item.time;

  return (
    <div
      className={`link-card${interacted ? " interacted" : ""}`}
      style={{ animationDelay: `${delay}s` }}
      data-key={linkKey}
    >
      <div className="link-time">
        <span className="time-hours" style={{ color: timeColor }}>
          {timeText}
        </span>
        <span className="time-date">{date}</span>
      </div>

      <div className="link-main-content">
        <div
          className="link-path"
          onClick={() => onOpen(linkKey)}
          style={{ cursor: "pointer", textDecoration: "none" }}
        >
          /<span className="path-random">{linkKey.slice(0, 13)}</span>
          <span className="path-index">{linkKey.slice(13)}</span>
        </div>
        {hasDetails && (
          <div className="link-details-row">
            {item.tt_id && <span className="detail-badge badge-id">ID: {item.tt_id}</span>}
            {item.box_bag && <span className="detail-badge badge-box">Box: {item.box_bag}</span>}
            {item.ratio && <span className="detail-badge badge-ratio">Ratio: {item.ratio}</span>}
            {item.live && <span className="detail-badge badge-live-viewers">Live: {item.live}</span>}
            {item.time && <span className="detail-badge badge-time">Time: {item.time}</span>}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
        <button
          className="copy-link-btn"
          onClick={handleCopy}
          style={
            copied
              ? {
                  borderColor: "var(--tiktok-cyan)",
                  color: "var(--tiktok-cyan)",
                  background: "rgba(255, 122, 0, 0.1)",
                }
              : undefined
          }
        >
          {copied ? "Copied! ✓" : "Copy"}
        </button>
        <button
          className="btn-open"
          disabled={opening}
          onClick={() => onOpen(linkKey)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            height: 32,
            border: "none",
            outline: "none",
            cursor: "pointer",
          }}
        >
          {opening ? "Mở..." : "Mở Link"}
        </button>
      </div>
    </div>
  );
}
