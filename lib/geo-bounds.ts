export type AreaBBox = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export function isWithinBBox(lat: number, lng: number, bbox: AreaBBox): boolean {
  return lat <= bbox.north && lat >= bbox.south && lng <= bbox.east && lng >= bbox.west;
}

export function formatBBoxParam(bbox: AreaBBox): string {
  return [bbox.south, bbox.west, bbox.north, bbox.east]
    .map((value) => value.toFixed(5))
    .join(",");
}

export function parseBBoxParam(raw: unknown): AreaBBox | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return null;
  const parts = value.split(",");
  if (parts.length !== 4 || parts.some((part) => part.trim() === "")) return null;
  const coordinates = parts.map(Number);
  if (!coordinates.every(Number.isFinite)) return null;
  const [south, west, north, east] = coordinates;
  if (south > north || west > east) return null;
  const clamp = (coordinate: number, limit: number) =>
    Math.max(-limit, Math.min(limit, coordinate));
  return {
    south: clamp(south, 90),
    west: clamp(west, 180),
    north: clamp(north, 90),
    east: clamp(east, 180),
  };
}
