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
  const deviceId = String(body?.device_id || "");
  if (!deviceId) return secureJson(400, BAD_REQUEST);

  const { status, json } = await callUpstream(
    req,
    `/api/check-auth?device_id=${encodeURIComponent(deviceId)}`,
    { method: "GET" },
  );
  return secureJson(status, json);
}
