import {
  type Kind,
  type Echelon,
  getUnitStats,
  DAMAGE_MULTIPLIERS,
  SUPPLY_COST,
} from "./unit-balance";
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
};
export const kinds: { id: Kind; label: string; short: string }[] = [
  { id: "infantry", label: "Мотопехота", short: "мсб" },
  { id: "armor", label: "Танковые", short: "тб" },
  { id: "artillery", label: "Артиллерия", short: "адн" },
  { id: "air", label: "Авиация", short: "ав" },
  { id: "drone", label: "БПЛА", short: "бпла" },
  { id: "airdefense", label: "ПВО", short: "зрдн" },
];
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
export function symbolSvg(kind: Kind, side = "blue") {
  const color = side === "blue" ? "#4cbfda" : "#ed8c82";
  const shape =
    kind === "armor"
      ? '<ellipse cx="24" cy="23" rx="13" ry="7"/>'
      : kind === "infantry"
        ? '<path d="M7 12L41 34M41 12L7 34"/>'
        : kind === "artillery"
          ? '<circle cx="24" cy="23" r="4" fill="currentColor"/>'
          : kind === "air"
            ? '<path d="M24 12V33M12 25L24 19L36 25M19 32L24 29L29 32"/>'
            : kind === "drone"
              ? '<path d="M15 16L33 30M33 16L15 30"/><circle cx="13" cy="15" r="4"/><circle cx="35" cy="15" r="4"/><circle cx="13" cy="31" r="4"/><circle cx="35" cy="31" r="4"/>'
              : '<path d="M11 29A13 13 0 0 1 37 29M24 15V30"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="40" viewBox="0 0 48 40" style="color:${color}"><path d="M21 2V8M27 2V8" stroke="currentColor" stroke-width="2"/><rect x="5" y="11" width="38" height="24" rx="1" fill="${side === "blue" ? "#193f49" : "#4e2f30"}" stroke="currentColor" stroke-width="1.8"/><g fill="none" stroke="currentColor" stroke-width="1.6">${shape}</g></svg>`;
}
/** Fixed substeps keep 5× equivalent to five 1× steps, including target selection. */
export function tickUnits(units: Unit[], elapsedSeconds: number): Unit[] {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return units;
  let next = units;
  for (
    let remaining = elapsedSeconds;
    remaining > 0;
    remaining -= Math.min(1, remaining)
  ) {
    next = stepUnits(next, Math.min(1, remaining));
  }
  return next;
}
function stepUnits(units: Unit[], dt: number): Unit[] {
  // All movement is resolved before all attacks; damage is applied simultaneously.
  const moved = units.map((u) => {
    if (u.hp <= 0) return u;
    const next = { ...u, order: "Удержание" };
    if (!u.target) return next;
    if (u.supply <= 0) return { ...next, order: "Нет снабжения" };
    const destination = { lat: u.target[0], lng: u.target[1] };
    const distance = distanceKm(u, destination);
    const step = Math.min(
      distance,
      (getUnitStats(u).speedKph * dt) / 3600,
      u.supply / SUPPLY_COST.movementPerKm,
    );
    Object.assign(next, moveToward(u, destination, step));
    next.supply = Math.max(0, u.supply - step * SUPPLY_COST.movementPerKm);
    if (step >= distance) next.target = undefined;
    else next.order = next.supply <= 0 ? "Нет снабжения" : "Движение";
    return next;
  });
  const incoming = new Array<number>(units.length).fill(0);
  const fired = new Set<number>();
  moved.forEach((attacker, i) => {
    if (attacker.hp <= 0 || attacker.supply <= 0) return;
    const stats = getUnitStats(attacker);
    let targetIndex = -1,
      nearest = Infinity;
    moved.forEach((candidate, j) => {
      if (
        candidate.side === attacker.side ||
        candidate.hp <= 0 ||
        DAMAGE_MULTIPLIERS[attacker.kind][candidate.kind] === 0
      )
        return;
      const distance = distanceKm(attacker, candidate);
      if (distance > stats.rangeKm) return;
      if (
        distance < nearest ||
        (distance === nearest &&
          candidate.id < (moved[targetIndex]?.id ?? "\uffff"))
      ) {
        targetIndex = j;
        nearest = distance;
      }
    });
    if (targetIndex < 0) return;
    const target = moved[targetIndex],
      defense = getUnitStats(target);
    const firingTime = Math.min(
      dt,
      attacker.supply / SUPPLY_COST.firingPerSecond,
    );
    const damage =
      ((stats.damagePerSecond *
        (attacker.hp / 100) *
        DAMAGE_MULTIPLIERS[attacker.kind][target.kind] *
        100) /
        (100 + defense.defense)) *
      firingTime;
    incoming[targetIndex] += (damage / defense.durability) * 100;
    fired.add(i);
  });
  return moved.map((u, i) => {
    if (u.hp <= 0) return u;
    const hp = Math.max(0, u.hp - incoming[i]);
    const supply = Math.max(
      0,
      u.supply - (fired.has(i) ? SUPPLY_COST.firingPerSecond * dt : 0),
    );
    const order =
      hp === 0
        ? "Выведен из строя"
        : fired.has(i)
          ? "В бою"
          : incoming[i] > 0
            ? "Под огнём"
            : supply === 0 && u.target
              ? "Нет снабжения"
              : u.order;
    return { ...u, hp, supply, order, target: hp === 0 ? undefined : u.target };
  });
}
