import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { buildCacheKey, getCached, setCached } from "@/services/mapCacheService";

const GOOGLE_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";

const GOOGLE_STATUS_MSGS: Record<string, string> = {
  INVALID_REQUEST: "Invalid geocoding request",
  REQUEST_DENIED: "Geocoding service unavailable",
  OVER_DAILY_LIMIT: "Geocoding quota exceeded",
  OVER_QUERY_LIMIT: "Too many requests, please retry shortly",
  UNKNOWN_ERROR: "Geocoding service error, please retry",
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  const latlng = searchParams.get("latlng");

  if (!address && !latlng) {
    return NextResponse.json({ error: "address or latlng required" }, { status: 400 });
  }

  const cacheKey = buildCacheKey({ address: address ?? "", latlng: latlng ?? "" });
  const cached = await getCached(cacheKey);
  if (cached) return NextResponse.json(cached);

  const serverKey = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!serverKey) {
    return NextResponse.json({ error: "Maps server key not configured" }, { status: 500 });
  }

  const params = new URLSearchParams({ key: serverKey });
  if (address) params.set("address", address);
  if (latlng) params.set("latlng", latlng);

  let data: { status: string; [key: string]: unknown };
  try {
    const apiRes = await fetch(`${GOOGLE_GEOCODE_URL}?${params.toString()}`);
    if (!apiRes.ok) {
      return NextResponse.json({ error: "Geocoding service unavailable" }, { status: 502 });
    }
    data = await apiRes.json();
  } catch {
    return NextResponse.json({ error: "Geocoding service unavailable" }, { status: 502 });
  }

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    const msg = GOOGLE_STATUS_MSGS[data.status] ?? "Geocoding unavailable";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  await setCached(cacheKey, "geocode", data, "geocode");

  return NextResponse.json(data);
}
