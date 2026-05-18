export interface DirectionsRequest {
  origin: string;
  destination: string;
  travelMode?: string;
  withTraffic?: boolean;
}

export async function fetchDirections(
  req: DirectionsRequest
): Promise<google.maps.DirectionsResult> {
  const params = new URLSearchParams({
    origin: req.origin,
    destination: req.destination,
    travelMode: req.travelMode ?? "DRIVING",
    withTraffic: String(req.withTraffic ?? true),
  });

  const res = await fetch(`/api/maps/directions?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Directions request failed");
  }
  return res.json();
}
