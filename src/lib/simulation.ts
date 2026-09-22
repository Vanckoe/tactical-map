import { type Kind, type Echelon, getUnitStats, UNIT_PROFILES, damageMultiplier } from "./unit-balance";
import { planRoute, terrainSpeed, terrainCover, type TerrainZone, type Waypoint } from "./terrain";
export { kinds } from "./unit-balance";
import { distanceKm, moveToward } from "./geo";
export type { Kind, Echelon } from "./unit-balance";
export type Unit = {
  id: string;
  name: string;
  kind: Kind;
  echelon: Echelon;
  side: "blue" | "red";
  lat: number;
  lng: number;
  hp: number;
  supply: number;
  order: string;
  target?: [number, number];
  advance?: boolean;
  route?: Waypoint[];
  stationarySeconds?: number;
  entrenchment?: number;
  suppression?: number;
  recoverableHp?: number;
};
export const initialUnits: Unit[] = [
  {
    id: "1",
    name: "1-й мотострелковый",
    kind: "infantry",
    echelon: "Батальон",
    side: "blue",
    lat: 43.32,
    lng: 76.76,
    hp: 100,
    supply: 94,
    order: "Удержание",
  },
  {
    id: "2",
    name: "2-й танковый",
    kind: "armor",
    echelon: "Батальон",
    side: "blue",
    lat: 43.4,
    lng: 76.91,
    hp: 100,
    supply: 88,
    order: "Удержание",
  },
  {
    id: "3",
    name: "3-й артиллерийский",
    kind: "artillery",
    echelon: "Полк",
    side: "blue",
    lat: 43.25,
    lng: 76.64,
    hp: 100,
    supply: 100,
    order: "Удержание",
  },
  {
    id: "4",
    name: "4-я разведывательная",
    kind: "drone",
    echelon: "Рота",
    side: "blue",
    lat: 43.47,
    lng: 77.03,
    hp: 100,
    supply: 92,
    order: "Удержание",
  },
  {
    id: "5",
    name: "5-й мотострелковый",
    kind: "infantry",
    echelon: "Батальон",
    side: "blue",
    lat: 43.23,
    lng: 76.92,
    hp: 100,
    supply: 96,
    order: "Удержание",
  },
  {
    id: "6",
    name: "6-я авиационная",
    kind: "air",
    echelon: "Бригада",
    side: "blue",
    lat: 43.36,
    lng: 77.06,
    hp: 100,
    supply: 100,
    order: "Удержание",
  },
  {
    id: "7",
    name: "1-й условный противник",
    kind: "infantry",
    echelon: "Батальон",
    side: "red",
    lat: 43.49,
    lng: 77.31,
    hp: 100,
    supply: 100,
    order: "Удержание",
  },
  {
    id: "8",
    name: "2-й условный противник",
    kind: "armor",
    echelon: "Батальон",
    side: "red",
    lat: 43.37,
    lng: 77.43,
    hp: 100,
    supply: 100,
    order: "Удержание",
  },
  {
    id: "9",
    name: "3-й условный противник",
    kind: "artillery",
    echelon: "Полк",
    side: "red",
    lat: 43.56,
    lng: 77.49,
    hp: 100,
    supply: 100,
    order: "Удержание",
  },
];
export { symbolSvg } from "./symbology";
/** One-second phases keep 50× identical to fifty 1× updates. */
export function tickUnits(units: Unit[], elapsedSeconds: number, terrain: TerrainZone[] = []): Unit[] {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return units;
  let next = units;
  for (let remaining = elapsedSeconds; remaining > 0; remaining -= Math.min(1, remaining)) {
    next = stepUnits(next, Math.min(1, remaining), terrain);
  }
  return next;
}
const clamp = (n: number, max = 100) => Math.max(0, Math.min(max, n));
const ready = (u: Unit) => u.hp > 0 && u.supply > 0 && !u.target && (u.stationarySeconds ?? 0) >= UNIT_PROFILES[u.kind].deploySeconds;
function jammed(u: Unit, units: Unit[]) {
  return u.kind === "drone" && units.some((other) => other.side !== u.side && other.kind === "ew" && ready(other) && distanceKm(u, other) <= UNIT_PROFILES.ew.supportKm);
}
export function detectedBySide(target: Unit, side: Unit["side"], units: Unit[], disrupted = new Set(units.filter((u) => jammed(u, units)).map((u) => u.id))) {
  return units.some((observer) => {
    if (observer.side !== side || observer.hp <= 0 || observer.supply <= 0) return false;
    const p = UNIT_PROFILES[observer.kind];
    // Radar range applies to air contacts, not to ground observation.
    const range = observer.kind === "airdefense" && !UNIT_PROFILES[target.kind].airborne ? 3 : p.detectionKm;
    return distanceKm(observer, target) <= range * (disrupted.has(observer.id) ? 0.4 : 1);
  });
}
function stepUnits(units: Unit[], dt: number, terrain: TerrainZone[]): Unit[] {
  const movedIds = new Set<string>();
  const disruptedBefore = new Set(units.filter((u) => jammed(u, units)).map((u) => u.id));
  const contacts = new Set(units.filter((u) => u.hp > 0 && detectedBySide(u, u.side === "blue" ? "red" : "blue", units, disruptedBefore)).map((u) => u.id));
  const moved = units.map((u) => {
    if (u.hp <= 0) return { ...u };
    const p = UNIT_PROFILES[u.kind];
    const next = { ...u, order: "Удержание", stationarySeconds: Math.min(3600, (u.stationarySeconds ?? 0) + dt), suppression: clamp((u.suppression ?? 0) - dt * 0.8), entrenchment: u.entrenchment ?? 0, recoverableHp: u.recoverableHp ?? 0 };
    const contact = u.advance && units.some((other) => other.side !== u.side && other.hp > 0 && contacts.has(other.id) && damageMultiplier(u.kind, other.kind) > 0 && distanceKm(u, other) <= p.rangeKm && distanceKm(u, other) >= p.minRangeKm);
    if (contact) { next.target = undefined; next.route = undefined; next.advance = false; }
    if (next.target && u.supply > 0) {
      const route = next.route ?? planRoute(u, { lat: next.target[0], lng: next.target[1] }, terrain, p.airborne);
      next.route = [...route];
      const waypoint = route[0];
      if (!waypoint) return { ...next, order: "Маршрут недоступен" };
      const destination = { lat: waypoint[0], lng: waypoint[1] };
      const distance = distanceKm(u, destination);
      const step = Math.min(distance, p.speedKph * (p.airborne ? 1 : terrainSpeed(u, terrain)) * (disruptedBefore.has(u.id) ? 0.5 : 1) * (1 - next.suppression / 150) * dt / 3600, u.supply / p.movementCost);
      Object.assign(next, moveToward(u, destination, step));
      next.supply = clamp(next.supply - step * p.movementCost);
      if (step > 0) { movedIds.add(u.id); next.stationarySeconds = 0; next.entrenchment = 0; }
      if (step >= distance) {
        next.route.shift();
        if (!next.route.length) { next.target = undefined; next.route = undefined; }
      }
      else next.order = "Движение";
    }
    if (p.airborne) next.supply = clamp(next.supply - dt * 0.015);
    if (!next.target && !p.airborne && next.supply > 0) next.entrenchment = clamp(next.entrenchment + dt / 120, 1);
    if (!p.fireOnMove && next.stationarySeconds < p.deploySeconds && !next.target) next.order = "Развёртывание";
    if (next.supply === 0) next.order = "Нет снабжения";
    return next;
  });
  const disrupted = new Set(moved.filter((u) => jammed(u, moved)).map((u) => u.id));
  const detected = new Set(moved.filter((u) => u.hp > 0 && detectedBySide(u, u.side === "blue" ? "red" : "blue", moved, disrupted)).map((u) => u.id));
  const incoming = moved.map(() => 0), pressure = moved.map(() => 0), spent = moved.map(() => 0);
  const fired = new Set<number>();
  moved.forEach((attacker, i) => {
    const p = UNIT_PROFILES[attacker.kind], stats = getUnitStats(attacker);
    if (attacker.hp <= 0 || attacker.supply <= 0 || p.damagePerSecond === 0 || (!p.fireOnMove && (!ready(attacker) || movedIds.has(attacker.id)))) return;
    const candidates = moved.map((target, j) => ({ target, j, distance: distanceKm(attacker, target), multiplier: damageMultiplier(attacker.kind, target.kind) }))
      .filter(({ target, distance, multiplier }) => target.side !== attacker.side && target.hp > 0 && multiplier > 0 && distance >= p.minRangeKm && distance <= p.rangeKm && detected.has(target.id))
      .sort((a, b) => (attacker.kind === "antitank" ? b.multiplier - a.multiplier : 0) || a.distance - b.distance || a.target.id.localeCompare(b.target.id));
    const chosen = candidates[0];
    if (!chosen) return;
    const { target, j, multiplier } = chosen, defense = getUnitStats(target);
    const firingTime = Math.min(dt, attacker.supply / p.firingCost);
    const damage = stats.damagePerSecond * attacker.hp / 100 * multiplier * (1 - (attacker.suppression ?? 0) / 150) * (movedIds.has(attacker.id) ? 0.5 : 1) * 100 / (100 + defense.defense) * (1 - (target.entrenchment ?? 0) * 0.3) * (UNIT_PROFILES[target.kind].airborne ? 1 : 1 - terrainCover(target, terrain)) * firingTime;
    incoming[j] += damage / defense.durability * 100;
    pressure[j] += (attacker.kind === "artillery" ? 4 : 1.5) * firingTime;
    spent[i] = p.firingCost * firingTime;
    fired.add(i);
  });
  const resolved = moved.map((u, i) => {
    if (u.hp <= 0) return u;
    const hp = clamp(u.hp - incoming[i]);
    const recoverableHp = Math.min(100 - hp, (u.recoverableHp ?? 0) + (u.hp - hp) * 0.25);
    return { ...u, hp, recoverableHp, suppression: clamp((u.suppression ?? 0) + pressure[i]), supply: clamp(u.supply - spent[i]), target: hp === 0 ? undefined : u.target,
      order: hp === 0 ? "Выведен из строя" : fired.has(i) ? "В бою" : incoming[i] > 0 ? "Под огнём" : u.order };
  });
  // Stable ID order makes shared support deterministic, independent of array order.
  const supportIndices = resolved.map((_, i) => i).sort((a, b) => resolved[a].id.localeCompare(resolved[b].id));
  const supported = new Set<string>();
  for (const i of supportIndices) {
    const donor = resolved[i], p = UNIT_PROFILES[donor.kind];
    if (!ready(donor) || movedIds.has(donor.id) || incoming[i] > 0 || (donor.suppression ?? 0) > 20 || !p.supportKm) continue;
    if (donor.kind === "ew") {
      if (resolved.some((u) => u.hp > 0 && u.side !== donor.side && u.kind === "drone" && distanceKm(donor, u) <= p.supportKm)) {
        donor.supply = clamp(donor.supply - dt * 0.03); donor.order = "Радиоподавление";
      }
      continue;
    }
    const targets = resolved.map((u, j) => ({ u, j, distance: distanceKm(donor, u) })).filter(({ u, j, distance }) =>
      u.id !== donor.id && u.side === donor.side && u.hp > 0 && !u.target && !movedIds.has(u.id) && incoming[j] === 0 && (u.suppression ?? 0) <= 20 && distance <= p.supportKm && !supported.has(`${donor.kind}:${u.id}`) &&
      (donor.kind === "logistics" ? u.kind !== "logistics" && u.supply < 100 : !UNIT_PROFILES[u.kind].airborne && (donor.kind === "medical" ? u.kind !== "armor" && (u.recoverableHp ?? 0) > 0 && u.hp < 100 : (u.entrenchment ?? 0) < 1)))
      .sort((a, b) => a.distance - b.distance || a.u.id.localeCompare(b.u.id));
    const recipient = targets[0]?.u;
    if (!recipient) continue;
    const donorStats = getUnitStats(donor), targetStats = getUnitStats(recipient);
    const effectiveness = donor.hp / 100;
    if (donor.kind === "logistics") {
      const amount = Math.min(donor.supply / 100 * donorStats.supplyCapacity, (100 - recipient.supply) / 100 * targetStats.supplyCapacity, donorStats.supplyCapacity * 0.001 * dt * effectiveness);
      donor.supply = clamp(donor.supply - amount / donorStats.supplyCapacity * 100);
      recipient.supply = clamp(recipient.supply + amount / targetStats.supplyCapacity * 100);
      donor.order = "Снабжение";
    } else if (donor.kind === "medical") {
      const restored = Math.min(recipient.recoverableHp ?? 0, 100 - recipient.hp, dt * effectiveness * donorStats.durability / targetStats.durability * 0.12, donor.supply);
      recipient.hp += restored; recipient.recoverableHp = Math.max(0, (recipient.recoverableHp ?? 0) - restored);
      donor.supply -= restored; donor.order = "Медицинская помощь";
    } else if (donor.kind === "engineer") {
      const work = Math.min(dt, donor.supply / 0.04);
      recipient.entrenchment = clamp((recipient.entrenchment ?? 0) + work * effectiveness / 40, 1);
      donor.supply = clamp(donor.supply - work * 0.04); donor.order = "Инженерные работы";
    }
    supported.add(`${donor.kind}:${recipient.id}`);
  }
  return resolved;
}
