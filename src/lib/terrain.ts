import { distanceKm, moveToward, type Position } from "./geo";
export type TerrainZone = Position & { id: string; label: string; type: "water" | "urban" | "rough"; radiusKm: number };
export type Waypoint = [number, number];
export function terrainAt(point: Position, zones: TerrainZone[]) {
  const inside = zones.filter((z) => distanceKm(point, z) < z.radiusKm);
  return inside.find((z) => z.type === "water")?.type ?? inside.find((z) => z.type === "rough")?.type ?? inside[0]?.type;
}
export function terrainSpeed(point: Position, zones: TerrainZone[]) {
  const type = terrainAt(point, zones);
  return type === "water" ? 0 : type === "rough" ? 0.45 : type === "urban" ? 0.65 : 1;
}
export function terrainCover(point: Position, zones: TerrainZone[]) { return terrainAt(point, zones) === "urban" ? 0.25 : terrainAt(point, zones) === "rough" ? 0.12 : 0; }
export function offset(point: Position, eastKm: number, northKm: number): Position {
  return { lat: point.lat + northKm / 111.2, lng: point.lng + eastKm / (111.2 * Math.cos(point.lat * Math.PI / 180)) };
}
/** Segment/circle clearance in a local tangent plane; never jump across narrow water. */
export function segmentCost(a: Position, b: Position, zones: TerrainZone[]) {
  const km = distanceKm(a, b);
  for (const zone of zones.filter((z) => z.type === "water")) {
    const sx = (a.lng - zone.lng) * 111.2 * Math.cos(zone.lat * Math.PI / 180), sy = (a.lat - zone.lat) * 111.2;
    const dx = (b.lng - a.lng) * 111.2 * Math.cos(zone.lat * Math.PI / 180), dy = (b.lat - a.lat) * 111.2;
    const t = Math.max(0, Math.min(1, -(sx * dx + sy * dy) / (dx * dx + dy * dy || 1)));
    if (Math.hypot(sx + t * dx, sy + t * dy) < zone.radiusKm * 1.01) return Infinity;
  }
  let cost = 0;
  for (let i = 0; i < 8; i++) cost += km / 8 / Math.max(0.1, terrainSpeed(moveToward(a, b, km * (i + 0.5) / 8), zones));
  return cost;
}
/** Small visibility graph: boundary waypoints + Dijkstra by travel-time cost. */
export function planRoute(from: Position, to: Position, zones: TerrainZone[], airborne = false): Waypoint[] {
  if (airborne || zones.length === 0) return [[to.lat, to.lng]];
  if (terrainAt(from, zones) === "water" || terrainAt(to, zones) === "water") return [];
  const nodes = [from, to, ...zones.flatMap((z) => Array.from({ length: 12 }, (_, i) => offset(z, Math.cos(i * Math.PI / 6) * z.radiusKm * 1.12, Math.sin(i * Math.PI / 6) * z.radiusKm * 1.12)))];
  const costs = nodes.map(() => Infinity), previous = nodes.map(() => -1), visited = new Set<number>();
  costs[0] = 0;
  for (let iteration = 0; iteration < nodes.length; iteration++) {
    let current = -1;
    for (let i = 0; i < nodes.length; i++) if (!visited.has(i) && (current === -1 || costs[i] < costs[current])) current = i;
    if (current < 0 || !Number.isFinite(costs[current])) break;
    if (current === 1) break;
    visited.add(current);
    for (let next = 0; next < nodes.length; next++) {
      if (visited.has(next) || next === current) continue;
      const cost = costs[current] + segmentCost(nodes[current], nodes[next], zones);
      if (cost < costs[next]) { costs[next] = cost; previous[next] = current; }
    }
  }
  if (!Number.isFinite(costs[1])) return [];
  const result: Waypoint[] = [];
  for (let i = 1; i > 0; i = previous[i]) result.unshift([nodes[i].lat, nodes[i].lng]);
  return result;
}
