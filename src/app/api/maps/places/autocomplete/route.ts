import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { buildCacheKey, getCached, setCached } from "@/services/mapCacheService";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { handleApiError, BadRequestError } from "@/lib/errors";

const GOOGLE_AUTOCOMPLETE_URL =
  "https://maps.googleapis.com/maps/api/place/autocomplete/json";

const GOOGLE_STATUS_MSGS: Record<string, string> = {
  INVALID_REQUEST: "Invalid autocomplete request",
  REQUEST_DENIED: "Places service unavailable",
  OVER_DAILY_LIMIT: "Places quota exceeded",
  OVER_QUERY_LIMIT: "Too many requests, please retry shortly",
  UNKNOWN_ERROR: "Places service error, please retry",
};

// Whitelist of place types we accept — narrows what callers can ask for
// and keeps cache hit rates high.
const ALLOWED_TYPES = new Set(["car_repair", "gas_station", "establishment", "geocode"]);

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const input = searchParams.get("input")?.trim() ?? "";
    const types = searchParams.get("types") ?? "establishment";
    const sessionToken = searchParams.get("sessiontoken") ?? "";
    const location = searchParams.get("location") ?? ""; // "lat,lng"
    const radius = searchParams.get("radius") ?? "";

    if (input.length < 3) {
      throw new BadRequestError("input must be at least 3 characters");
    }
    if (input.length > 100) {
      throw new BadRequestError("input too long");
    }
    if (!ALLOWED_TYPES.has(types)) {
      throw new BadRequestError("unsupported types parameter");
    }

    // Cache key intentionally excludes sessiontoken — same query benefits
    // every user. Session tokens are used for billing only, not as cache scope.
    const cacheKey = buildCacheKey({ input: input.toLowerCase(), types, location, radius });
    const cached = await getCached(cacheKey);
    if (cached) return NextResponse.json(cached);

    await enforceRateLimit(session.user.id, RATE_LIMITS.placesAutocomplete);

    const serverKey = process.env.GOOGLE_MAPS_SERVER_KEY;
    if (!serverKey) {
      return NextResponse.json({ error: "Maps server key not configured" }, { status: 500 });
    }

    const params = new URLSearchParams({
      key: serverKey,
      input,
      types,
      // India bias by default — adjust if you go international later
      components: "country:in",
    });
    if (sessionToken) params.set("sessiontoken", sessionToken);
    if (location) params.set("location", location);
    if (radius) params.set("radius", radius);

    let data: { status: string; predictions?: unknown[]; [key: string]: unknown };
    try {
      const apiRes = await fetch(`${GOOGLE_AUTOCOMPLETE_URL}?${params.toString()}`);
      if (!apiRes.ok) {
        return NextResponse.json({ error: "Places service unavailable" }, { status: 502 });
      }
      data = await apiRes.json();
    } catch {
      return NextResponse.json({ error: "Places service unavailable" }, { status: 502 });
    }

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      const msg = GOOGLE_STATUS_MSGS[data.status] ?? "Places unavailable";
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    // Strip everything except what the client picker needs — shrinks cache rows
    // and prevents downstream code from depending on Google's full shape.
    const trimmed = {
      status: data.status,
      predictions: (data.predictions ?? []).map((p) => {
        const pred = p as {
          place_id?: string;
          description?: string;
          structured_formatting?: { main_text?: string; secondary_text?: string };
          types?: string[];
        };
        return {
          place_id: pred.place_id ?? "",
          description: pred.description ?? "",
          main_text: pred.structured_formatting?.main_text ?? pred.description ?? "",
          secondary_text: pred.structured_formatting?.secondary_text ?? "",
          types: pred.types ?? [],
        };
      }),
    };

    await setCached(cacheKey, "autocomplete", trimmed, "autocomplete");

    return NextResponse.json(trimmed);
  } catch (error) {
    return handleApiError(error);
  }
}
