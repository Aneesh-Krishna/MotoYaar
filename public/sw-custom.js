const TILE_CACHE = "osm-tiles-v1";
const TILE_ORIGIN = "tile.openstreetmap.org";
const TILE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (!url.hostname.includes(TILE_ORIGIN)) return; // only intercept OSM tiles

  event.respondWith(
    caches.open(TILE_CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) {
        // Check age via Date header
        const dateHeader = cached.headers.get("date");
        const age = dateHeader ? Date.now() - new Date(dateHeader).getTime() : Infinity;
        if (age < TILE_MAX_AGE_MS) return cached; // fresh — serve from cache
        // Stale but offline — still serve stale
        if (!navigator.onLine) return cached;
      }
      // Fetch from network and update cache
      try {
        const response = await fetch(event.request);
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      } catch {
        return cached ?? new Response("Tile unavailable offline", { status: 503 });
      }
    })
  );
});
