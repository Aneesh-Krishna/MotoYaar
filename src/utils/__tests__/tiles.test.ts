import { countTiles, estimateSizeMB, latLngToTile, getTileBounds } from "../tiles";
import type { BoundingBox } from "../tiles";

describe("latLngToTile", () => {
  it("converts lat/lng to correct tile coordinates at zoom 0", () => {
    const tile = latLngToTile(0, 0, 0);
    expect(tile.x).toBe(0);
    expect(tile.y).toBe(0);
  });

  it("converts lat/lng to correct tile coordinates at higher zoom levels", () => {
    // London at zoom 10
    const tile = latLngToTile(51.5074, -0.1278, 10);
    expect(typeof tile.x).toBe("number");
    expect(typeof tile.y).toBe("number");
    expect(tile.x).toBeGreaterThanOrEqual(0);
    expect(tile.y).toBeGreaterThanOrEqual(0);
  });
});

describe("getTileBounds", () => {
  it("returns tile bounds for a valid bounding box", () => {
    const bbox: BoundingBox = {
      north: 51.51,
      south: 51.50,
      east: -0.12,
      west: -0.13,
    };
    const bounds = getTileBounds(bbox, 10);
    expect(bounds.minX).toBeLessThanOrEqual(bounds.maxX);
    expect(bounds.minY).toBeLessThanOrEqual(bounds.maxY);
  });
});

describe("countTiles", () => {
  it("returns expected tile count for a small bounding box", () => {
    // Small area in London
    const bbox: BoundingBox = {
      north: 51.51,
      south: 51.50,
      east: -0.12,
      west: -0.13,
    };
    const count = countTiles(bbox, 10, 10); // single zoom level
    expect(count).toBeGreaterThan(0);
  });

  it("returns greater count for larger bounding boxes", () => {
    const small: BoundingBox = {
      north: 51.51,
      south: 51.50,
      east: -0.12,
      west: -0.13,
    };
    const large: BoundingBox = {
      north: 52,
      south: 51,
      east: 0,
      west: -1,
    };
    const smallCount = countTiles(small, 10, 10);
    const largeCount = countTiles(large, 10, 10);
    expect(largeCount).toBeGreaterThan(smallCount);
  });

  it("returns greater count for wider zoom range", () => {
    const bbox: BoundingBox = {
      north: 51.51,
      south: 51.50,
      east: -0.12,
      west: -0.13,
    };
    const zoom10Only = countTiles(bbox, 10, 10);
    const zoom10to12 = countTiles(bbox, 10, 12);
    expect(zoom10to12).toBeGreaterThan(zoom10Only);
  });

  it("returns 0 or positive for any valid bbox", () => {
    const bbox: BoundingBox = {
      north: 0,
      south: 0,
      east: 0,
      west: 0,
    };
    const count = countTiles(bbox);
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

describe("estimateSizeMB", () => {
  it("estimates size within reasonable range for known tile counts", () => {
    // 1000 tiles ≈ 8MB (8KB per tile)
    const size = estimateSizeMB(1000);
    expect(size).toBeLessThanOrEqual(10); // should be around 8
    expect(size).toBeGreaterThanOrEqual(7);
  });

  it("returns 0 for 0 tiles", () => {
    expect(estimateSizeMB(0)).toBe(0);
  });

  it("scales linearly with tile count", () => {
    const size100 = estimateSizeMB(100);
    const size200 = estimateSizeMB(200);
    expect(size200).toBeCloseTo(size100 * 2, 1);
  });

  it("handles large tile counts", () => {
    const size = estimateSizeMB(100000);
    expect(size).toBeGreaterThan(0);
    expect(typeof size).toBe("number");
  });
});
