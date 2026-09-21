const EARTH_KM = 6371;
const rad = (angle: number) => (angle * Math.PI) / 180;
const deg = (angle: number) => (angle * 180) / Math.PI;
export type Position = { lat: number; lng: number };
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
