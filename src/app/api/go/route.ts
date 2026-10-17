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
  const shopId = String(body?.shop_id || "");
  if (!deviceId || !shopId) return secureJson(400, BAD_REQUEST);

  const ts = Date.now();
  const sig = signRequest(deviceId, ts);

  const { status, json } = await callUpstream(
    req,
    "/api/v2/feed/claim-link",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-device-id": deviceId,
        "x-req-ts": String(ts),
        "x-req-sig": sig,
      },
      body: JSON.stringify({ device_id: deviceId, shop_id: shopId, ts, sig }),
    },
  );
  return secureJson(status, json);
}
