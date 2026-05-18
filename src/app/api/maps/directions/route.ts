import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { buildCacheKey, getCached, setCached } from "@/services/mapCacheService";

const GOOGLE_DIRECTIONS_URL = "https://maps.googleapis.com/maps/api/directions/json";

const GOOGLE_STATUS_MSGS: Record<string, string> = {
  NOT_FOUND: "Origin or destination could not be found",
  ZERO_RESULTS: "No route found between origin and destination",
  MAX_WAYPOINTS_EXCEEDED: "Too many waypoints specified",
  INVALID_REQUEST: "Invalid directions request",
  REQUEST_DENIED: "Directions service unavailable",
  OVER_DAILY_LIMIT: "Directions quota exceeded",
  OVER_QUERY_LIMIT: "Too many requests, please retry shortly",
  UNKNOWN_ERROR: "Directions service error, please retry",
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const origin = searchParams.get("origin");
  const destination = searchParams.get("destination");
  const travelMode = searchParams.get("travelMode") ?? "DRIVING";
  const withTraffic = searchParams.get("withTraffic") !== "false";

  if (!origin || !destination) {
    return NextResponse.json({ error: "origin and destination required" }, { status: 400 });
  }

  const cacheKey = buildCacheKey({ origin, destination, travelMode, withTraffic: String(withTraffic) });
  const cached = await getCached(cacheKey);
  if (cached) return NextResponse.json(cached);

  const serverKey = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!serverKey) {
    return NextResponse.json({ error: "Maps server key not configured" }, { status: 500 });
  }

  const params = new URLSearchParams({
    origin,
    destination,
    mode: travelMode.toLowerCase(),
    key: serverKey,
    ...(withTraffic ? { departure_time: "now" } : {}),
  });

  let data: { status: string; [key: string]: unknown };
  try {
    const apiRes = await fetch(`${GOOGLE_DIRECTIONS_URL}?${params.toString()}`);
    if (!apiRes.ok) {
      return NextResponse.json({ error: "Directions service unavailable" }, { status: 502 });
    }
    data = await apiRes.json();
  } catch {
    return NextResponse.json({ error: "Directions service unavailable" }, { status: 502 });
  }

  if (data.status !== "OK") {
    const msg = GOOGLE_STATUS_MSGS[data.status] ?? "Directions unavailable";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const ttlKey = withTraffic ? "directions_traffic" : "directions_static";
  await setCached(cacheKey, "directions", data, ttlKey);

  return NextResponse.json(data);
}
