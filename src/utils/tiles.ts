export interface TileBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export function latLngToTile(
  lat: number,
  lng: number,
  zoom: number
): { x: number; y: number } {
  const n = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x, y };
}

export function getTileBounds(bbox: BoundingBox, zoom: number): TileBounds {
  const ne = latLngToTile(bbox.north, bbox.east, zoom);
  const sw = latLngToTile(bbox.south, bbox.west, zoom);
  return {
    minX: Math.min(ne.x, sw.x),
    maxX: Math.max(ne.x, sw.x),
    minY: Math.min(ne.y, sw.y),
    maxY: Math.max(ne.y, sw.y),
  };
}

export function countTiles(
  bbox: BoundingBox,
  minZoom = 10,
  maxZoom = 16
): number {
  let total = 0;
  for (let z = minZoom; z <= maxZoom; z++) {
    const b = getTileBounds(bbox, z);
    total += (b.maxX - b.minX + 1) * (b.maxY - b.minY + 1);
  }
  return total;
}

export function estimateSizeMB(tileCount: number): number {
  return Math.round((tileCount * 8) / 1024 * 10) / 10;
}

export function* tileUrls(
  bbox: BoundingBox,
  minZoom = 10,
  maxZoom = 16
): Generator<string> {
  const subdomains = ["a", "b", "c"];
  let i = 0;
  for (let z = minZoom; z <= maxZoom; z++) {
    const b = getTileBounds(bbox, z);
    for (let x = b.minX; x <= b.maxX; x++) {
      for (let y = b.minY; y <= b.maxY; y++) {
        const s = subdomains[i++ % 3];
        yield `https://${s}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
      }
    }
  }
}
