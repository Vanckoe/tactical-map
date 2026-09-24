const EARTH_KM = 6371;
const rad = (angle: number) => (angle * Math.PI) / 180;
const deg = (angle: number) => (angle * 180) / Math.PI;
export type Position = { lat: number; lng: number };
/** Boundary-inclusive point test for a simple ring in [latitude, longitude] order. */
export function pointInPolygon(point: Position, polygon: readonly (readonly [number, number])[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ay, ax] = polygon[j], [by, bx] = polygon[i];
    const cross = (point.lng - ax) * (by - ay) - (point.lat - ay) * (bx - ax);
    if (Math.abs(cross) < 1e-12 && point.lng >= Math.min(ax, bx) - 1e-10 && point.lng <= Math.max(ax, bx) + 1e-10 && point.lat >= Math.min(ay, by) - 1e-10 && point.lat <= Math.max(ay, by) + 1e-10) return true;
    if ((ay > point.lat) !== (by > point.lat) && point.lng < (bx - ax) * (point.lat - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}

/** Endpoints alone are insufficient when a border has concave bends. */
export function segmentInPolygon(from: Position, to: Position, polygon: readonly (readonly [number, number])[]): boolean {
  if (!pointInPolygon(from, polygon) || !pointInPolygon(to, polygon)) return false;
  const dx = to.lng - from.lng, dy = to.lat - from.lat;
  const cuts = [0, 1];
  for (let i = 0; i < polygon.length; i++) {
    const [ay, ax] = polygon[i], [by, bx] = polygon[(i + 1) % polygon.length];
    const ex = bx - ax, ey = by - ay, denominator = dx * ey - dy * ex;
    if (Math.abs(denominator) < 1e-15) continue;
    const qx = ax - from.lng, qy = ay - from.lat;
    const t = (qx * ey - qy * ex) / denominator, u = (qx * dy - qy * dx) / denominator;
    if (t > 0 && t < 1 && u >= 0 && u <= 1) cuts.push(t);
  }
  cuts.sort((a, b) => a - b);
  return cuts.slice(1).every((cut, i) => {
    const t = (cut + cuts[i]) / 2;
    return pointInPolygon({ lat: from.lat + dy * t, lng: from.lng + dx * t }, polygon);
  });
}
export function distanceKm(a: Position, b: Position): number {
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) *
      Math.cos(rad(b.lat)) *
      Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}
/** Кратчайшая дуга на сфере, в том числе при пересечении ±180° долготы. */
export function moveToward(from: Position, to: Position, km: number): Position {
  if (km >= distanceKm(from, to)) return { lat: to.lat, lng: to.lng };
  if (km <= 0) return { lat: from.lat, lng: from.lng };
  const lat = rad(from.lat),
    destLat = rad(to.lat),
    deltaLng = rad(to.lng - from.lng);
  const bearing = Math.atan2(
    Math.sin(deltaLng) * Math.cos(destLat),
    Math.cos(lat) * Math.sin(destLat) -
      Math.sin(lat) * Math.cos(destLat) * Math.cos(deltaLng),
  );
  const angle = km / EARTH_KM;
  const nextLat = Math.asin(
    Math.sin(lat) * Math.cos(angle) +
      Math.cos(lat) * Math.sin(angle) * Math.cos(bearing),
  );
  const nextLng =
    rad(from.lng) +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angle) * Math.cos(lat),
      Math.cos(angle) - Math.sin(lat) * Math.sin(nextLat),
    );
  return { lat: deg(nextLat), lng: ((deg(nextLng) + 540) % 360) - 180 };
}
