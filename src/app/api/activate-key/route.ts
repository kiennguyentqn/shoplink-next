import { NextRequest } from "next/server";
import {
  BAD_REQUEST,
  callUpstream,
  readSecureBody,
  secureJson,
} from "@/lib/server/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await readSecureBody(req);
  const key = String(body?.key || "");
  const deviceId = String(body?.device_id || "");
  if (!key || !deviceId) return secureJson(400, BAD_REQUEST);

  const { status, json } = await callUpstream(req, "/api/activate-key", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, device_id: deviceId }),
  });
  return secureJson(status, json);
}
