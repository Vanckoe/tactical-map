import type { Unit } from "./simulation";
import { distanceKm, pointInPolygon, type Position } from "./geo";
import { offset, terrainAt, type TerrainZone } from "./terrain";

export const TRANSPORT_CAPACITY = 5;
export const TRANSFER_SECONDS = 300;
export type TransportOperation = { type: "board" | "disembark"; unitIds: string[]; remainingSeconds: number };
export type TransportArea = { terrain?: TerrainZone[]; polygon?: readonly (readonly [number, number])[] };
export const passengersOf = (units: Unit[], id: string) => units.filter((u) => u.carrierId === id);
export const transportLocked = (u: Unit, units: Unit[]) => !!u.carrierId || !!u.transportOperation || units.some((v) => v.transportOperation?.unitIds.includes(u.id));
export const stopUnit = (u: Unit): Unit => ({ ...u, target: undefined, route: undefined, patrol: undefined, advance: false, order: "Удержание" });
export function boardableUnits(units: Unit[], carrier: Unit): Unit[] {
  return units.filter((u) => u.kind === "infantry" && u.echelon === "Взвод" && u.hp > 0 && u.side === carrier.side && !transportLocked(u, units) && distanceKm(u, carrier) <= 0.1);
}
function landingPositions(carrier: Position, count: number, area: TransportArea): Position[] {
  const valid = (p: Position) => terrainAt(p, area.terrain ?? []) !== "water" && (!area.polygon || pointInPolygon(p, area.polygon));
  const preferred = Array.from({ length: count }, (_, i) => offset(carrier, Math.cos(i * 2 * Math.PI / count) * 0.06, Math.sin(i * 2 * Math.PI / count) * 0.06));
  const points = [...preferred, ...[0.04, 0.075, 0.02].flatMap((radius) => Array.from({ length: 16 }, (_, i) => offset(carrier, Math.cos(i * Math.PI / 8) * radius, Math.sin(i * Math.PI / 8) * radius)))].filter(valid);
  if (valid(carrier)) while (points.length < count) points.push({ lat: carrier.lat, lng: carrier.lng });
  return points.slice(0, count);
}
export function beginTransportOperation(units: Unit[], carrierId: string, type: TransportOperation["type"], unitIds: string[], area: TransportArea = {}): Unit[] {
  const carrier = units.find((u) => u.id === carrierId);
  if (!carrier || carrier.kind !== "transport" || carrier.hp <= 0 || carrier.target || transportLocked(carrier, units) || !unitIds.length || new Set(unitIds).size !== unitIds.length) return units;
  const passengers = passengersOf(units, carrierId);
  const eligible = type === "board" ? boardableUnits(units, carrier) : passengers;
  if (unitIds.some((id) => !eligible.some((u) => u.id === id)) || (type === "board" && passengers.length + unitIds.length > TRANSPORT_CAPACITY) || (type === "disembark" && landingPositions(carrier, unitIds.length, area).length < unitIds.length)) return units;
  return units.map((u) => u.id === carrierId ? { ...stopUnit(u), transportOperation: { type, unitIds: [...unitIds], remainingSeconds: TRANSFER_SECONDS }, order: type === "board" ? "Посадка" : "Высадка" } : unitIds.includes(u.id) ? { ...stopUnit(u), order: type === "board" ? "Посадка" : "В транспорте" } : u);
}
export function cancelTransportOperation(units: Unit[], carrierId: string): Unit[] {
  const carrier = units.find((u) => u.id === carrierId);
  const ids = carrier?.transportOperation?.unitIds ?? [];
  return units.map((u) => u.id === carrierId ? { ...stopUnit(u), transportOperation: undefined } : ids.includes(u.id) ? { ...stopUnit(u), order: u.carrierId ? "В транспорте" : "Удержание" } : u);
}
export function releaseTransport(units: Unit[], carrierId: string, area: TransportArea = {}): Unit[] {
  const carrier = units.find((u) => u.id === carrierId);
  if (!carrier) return units;
  const passengers = passengersOf(units, carrierId);
  const points = landingPositions(carrier, passengers.length, area);
  return cancelTransportOperation(units, carrierId).map((u) => {
    const index = passengers.findIndex((p) => p.id === u.id);
    return index < 0 ? u : { ...stopUnit(u), ...(points[index] ?? { lat: carrier.lat, lng: carrier.lng }), carrierId: undefined, transportOperation: undefined };
  });
}
/** Called after each simulation second; passengers never enter the combat/movement phases. */
export function tickTransport(units: Unit[], dt: number, area: TransportArea = {}): Unit[] {
  let next = units;
  for (const carrier of units.filter((u) => u.kind === "transport")) {
    if (carrier.hp <= 0) { next = releaseTransport(next, carrier.id, area); continue; }
    const op = carrier.transportOperation;
    if (!op) continue;
    const valid = op.unitIds.every((id) => next.some((u) => u.id === id && u.hp > 0 && u.side === carrier.side && (op.type === "board" ? !u.carrierId && distanceKm(u, carrier) <= 0.1 : u.carrierId === carrier.id)));
    if (!valid) { next = cancelTransportOperation(next, carrier.id); continue; }
    const remainingSeconds = Math.max(0, op.remainingSeconds - dt);
    if (remainingSeconds > 0) {
      next = next.map((u) => u.id === carrier.id ? { ...u, transportOperation: { ...op, remainingSeconds }, order: op.type === "board" ? "Посадка" : "Высадка" } : u);
      continue;
    }
    const points = landingPositions(carrier, op.unitIds.length, area);
    if (op.type === "disembark" && points.length < op.unitIds.length) { next = cancelTransportOperation(next, carrier.id); continue; }
    next = cancelTransportOperation(next, carrier.id).map((u) => {
      const i = op.unitIds.indexOf(u.id);
      if (i < 0) return u;
      const position = op.type === "board" ? { lat: carrier.lat, lng: carrier.lng } : points[i];
      return { ...stopUnit(u), ...position, carrierId: op.type === "board" ? carrier.id : undefined, order: op.type === "board" ? "В транспорте" : "Удержание", stationarySeconds: 0, entrenchment: 0 };
    });
  }
  return next.map((u) => {
    if (!u.carrierId) return u;
    const carrier = next.find((v) => v.id === u.carrierId);
    return carrier ? { ...stopUnit(u), lat: carrier.lat, lng: carrier.lng, order: "В транспорте" } : { ...stopUnit(u), carrierId: undefined };
  });
}
/** Validate cross-unit references before accepting a save. Old saves have no transport fields. */
export function validTransportState(units: Unit[]): boolean {
  if (new Set(units.map((u) => u.id)).size !== units.length) return false;
  const reserved = new Set<string>();
  return units.every((u) => {
    if (u.carrierId !== undefined) {
      const carrier = units.find((v) => v.id === u.carrierId);
      if (typeof u.carrierId !== "string" || !carrier || carrier.kind !== "transport" || carrier.hp <= 0 || carrier.side !== u.side || u.kind !== "infantry" || u.echelon !== "Взвод" || u.hp <= 0 || u.target || u.patrol || u.transportOperation) return false;
    }
    if (u.kind === "transport" && passengersOf(units, u.id).length > TRANSPORT_CAPACITY) return false;
    const op = u.transportOperation;
    if (op === undefined) return true;
    if (!op || u.kind !== "transport" || u.hp <= 0 || u.target || u.patrol || !["board", "disembark"].includes(op.type) || !Number.isFinite(op.remainingSeconds) || op.remainingSeconds <= 0 || op.remainingSeconds > TRANSFER_SECONDS || !Array.isArray(op.unitIds) || !op.unitIds.length || op.unitIds.length > TRANSPORT_CAPACITY) return false;
    if (op.type === "board" && passengersOf(units, u.id).length + op.unitIds.length > TRANSPORT_CAPACITY) return false;
    return op.unitIds.every((id) => {
      if (reserved.has(id)) return false;
      reserved.add(id);
      const p = units.find((v) => v.id === id);
      return !!p && p.kind === "infantry" && p.echelon === "Взвод" && p.side === u.side && p.hp > 0 && !p.target && !p.patrol && (op.type === "board" ? !p.carrierId && distanceKm(p, u) <= 0.1 : p.carrierId === u.id);
    });
  });
}
