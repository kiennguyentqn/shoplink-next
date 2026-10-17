import { NextRequest } from "next/server";
import {
  BAD_REQUEST,
  callUpstream,
  readSecureBody,
  secureJson,
  signRequest,
} from "@/lib/server/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await readSecureBody(req);
  const deviceId = String(body?.device_id || "");
  if (!deviceId) return secureJson(400, BAD_REQUEST);

  const ts = Date.now();
  const sig = signRequest(deviceId, ts);

  const { status, json } = await callUpstream(
    req,
    `/api/v2/feed/stream?device_id=${encodeURIComponent(deviceId)}&ts=${ts}&sig=${sig}`,
    {
      method: "GET",
      headers: {
        "x-device-id": deviceId,
        "x-req-ts": String(ts),
        "x-req-sig": sig,
      },
    },
  );
  return secureJson(status, json);
}
