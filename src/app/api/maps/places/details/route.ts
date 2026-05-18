import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { buildCacheKey, getCached, setCached } from "@/services/mapCacheService";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { placeUpsertService, type PlaceDetails } from "@/services/placeUpsertService";
import { handleApiError, BadRequestError } from "@/lib/errors";

const GOOGLE_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json";

const GOOGLE_STATUS_MSGS: Record<string, string> = {
  INVALID_REQUEST: "Invalid place details request",
  NOT_FOUND: "Place not found",
  REQUEST_DENIED: "Places service unavailable",
  OVER_DAILY_LIMIT: "Places quota exceeded",
  OVER_QUERY_LIMIT: "Too many requests, please retry shortly",
  UNKNOWN_ERROR: "Places service error, please retry",
};

const PLACE_ID_RE = /^[A-Za-z0-9_-]{10,200}$/;
const ENTITIES = new Set(["service-center", "fuel-station"]);

interface AddressComponent {
  long_name?: string;
  short_name?: string;
  types?: string[];
}

function extractCityAndPincode(components: AddressComponent[] | undefined): {
  city?: string;
  pincode?: string;
} {
  if (!components) return {};
  let city: string | undefined;
  let pincode: string | undefined;
  for (const c of components) {
    const types = c.types ?? [];
    if (!city && (types.includes("locality") || types.includes("administrative_area_level_2"))) {
      city = c.long_name ?? c.short_name;
    }
    if (!pincode && types.includes("postal_code")) {
      pincode = c.long_name ?? c.short_name;
    }
  }
  return { city, pincode };
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const placeId = searchParams.get("place_id") ?? "";
    const entity = searchParams.get("entity") ?? ""; // "service-center" | "fuel-station"
    const sessionToken = searchParams.get("sessiontoken") ?? "";

    if (!PLACE_ID_RE.test(placeId)) {
      throw new BadRequestError("Invalid place_id");
    }
    if (!ENTITIES.has(entity)) {
      throw new BadRequestError("entity must be service-center or fuel-station");
    }

    const cacheKey = buildCacheKey({ kind: "details", place_id: placeId });

    let details: PlaceDetails | null = null;
    const cached = await getCached(cacheKey);
    if (cached) {
      details = cached as PlaceDetails;
    } else {
      await enforceRateLimit(session.user.id, RATE_LIMITS.placesDetails);

      const serverKey = process.env.GOOGLE_MAPS_SERVER_KEY;
      if (!serverKey) {
        return NextResponse.json({ error: "Maps server key not configured" }, { status: 500 });
      }

      const params = new URLSearchParams({
        key: serverKey,
        place_id: placeId,
        fields: "place_id,name,formatted_address,geometry/location,address_components",
      });
      if (sessionToken) params.set("sessiontoken", sessionToken);

      let data: {
        status: string;
        result?: {
          place_id?: string;
          name?: string;
          formatted_address?: string;
          geometry?: { location?: { lat?: number; lng?: number } };
          address_components?: AddressComponent[];
        };
        [key: string]: unknown;
      };
      try {
        const apiRes = await fetch(`${GOOGLE_DETAILS_URL}?${params.toString()}`);
        if (!apiRes.ok) {
          return NextResponse.json({ error: "Places service unavailable" }, { status: 502 });
        }
        data = await apiRes.json();
      } catch {
        return NextResponse.json({ error: "Places service unavailable" }, { status: 502 });
      }

      if (data.status !== "OK") {
        const msg = GOOGLE_STATUS_MSGS[data.status] ?? "Places unavailable";
        const status = data.status === "NOT_FOUND" ? 404 : 502;
        return NextResponse.json({ error: msg }, { status });
      }

      const r = data.result;
      if (!r || !r.name) {
        return NextResponse.json({ error: "Place details incomplete" }, { status: 502 });
      }

      const { city, pincode } = extractCityAndPincode(r.address_components);
      details = {
        placeId: r.place_id ?? placeId,
        name: r.name,
        formattedAddress: r.formatted_address,
        city,
        pincode,
        lat: r.geometry?.location?.lat,
        lng: r.geometry?.location?.lng,
      };

      await setCached(cacheKey, "autocomplete", details, "autocomplete");
    }

    // Upsert to local DB and return the local entity row.
    if (entity === "service-center") {
      const row = await placeUpsertService.upsertServiceCenter(details, session.user.id);
      return NextResponse.json({ kind: "service-center", entity: row });
    } else {
      const row = await placeUpsertService.upsertFuelStation(details);
      return NextResponse.json({ kind: "fuel-station", entity: row });
    }
  } catch (error) {
    return handleApiError(error);
  }
}
