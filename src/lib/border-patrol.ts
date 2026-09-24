import { distanceKm, moveToward, pointInPolygon, segmentInPolygon, type Position } from "./geo";
import { offset } from "./terrain";
import { detectedBySide, tickUnits, type Unit } from "./simulation";
import type { Scenario } from "./scenarios";
import type { Battle } from "./battle";

export type ObservedUnit = Unit & { contactLost?: boolean };

export function intruderVisible(units: Unit[], scenario: Scenario): boolean {
  const rules = scenario.borderPatrol;
  if (!rules) return false;
  const intruder = units.find((u) => u.id === rules.intruderId);
  return !!intruder && units.some((u) => u.side === "blue" && u.hp > 0 && distanceKm(u, intruder) <= rules.detectionRadiusKm);
}

/** All player-facing unit views use this projection, never hidden live positions. */
export function observedUnits(state: Battle, scenario?: Scenario, botEnabled = true): ObservedUnit[] {
  if (!botEnabled || !scenario?.borderPatrol) return state.units;
  const visible = intruderVisible(state.units, scenario);
  return state.units.flatMap((u): ObservedUnit[] => {
    if (u.side === "blue") return [u];
    if (visible) return [{ ...u, target: undefined, route: undefined, patrol: undefined, order: state.borderOutcome === "captured" ? "Задержан" : "Обнаружен" }];
    if (!state.lastKnownIntruder) return [];
    const original = scenario.units.find((unit) => unit.id === scenario.borderPatrol!.intruderId)!;
    return [{ ...original, lat: state.lastKnownIntruder.lat, lng: state.lastKnownIntruder.lng, contactLost: true, order: "Контакт потерян" }];
  });
}

export function insideTerritory(point: Position, scenario: Scenario): boolean {
  const bounds = scenario.borderPatrol?.territory;
  return !!bounds && point.lat >= bounds.south && point.lat <= bounds.north && point.lng >= bounds.west && point.lng <= bounds.east && pointInPolygon(point, bounds.polygon);
}

/** Generic game steering in the explicitly schematic play area. */
function steerIntruder(intruder: Unit, units: Unit[], scenario: Scenario, entered: boolean): Unit {
  const goal = entered ? scenario.objectives[0] : scenario.borderPatrol!.entry;
  let destination: Position = goal;
  if (entered) {
    const visible = units.filter((u) => u.side === "blue" && u.hp > 0 && detectedBySide(u, "red", units));
    if (visible.length) {
      const forward = moveToward(intruder, goal, 1);
      const candidates = [forward, ...Array.from({ length: 16 }, (_, i) => offset(intruder, Math.cos(i * Math.PI / 8), Math.sin(i * Math.PI / 8)))].filter((p) => segmentInPolygon(intruder, p, scenario.borderPatrol!.territory.polygon));
      const score = (point: Position) => distanceKm(point, goal) + visible.reduce((penalty, guard) => penalty + Math.max(0, 3 - distanceKm(point, guard)) * 4, 0);
      destination = candidates.sort((a, b) => score(a) - score(b))[0] ?? intruder;
    }
  }
  return { ...intruder, target: [destination.lat, destination.lng], route: undefined, patrol: undefined, advance: false, order: entered ? "К Петропавлу" : "К границе" };
}

export function tickBorderPatrol(state: Battle, scenario: Scenario, botEnabled: boolean): Battle {
  const rules = scenario.borderPatrol!;
  const oldIntruder = state.units.find((u) => u.id === rules.intruderId);
  const entered = state.borderEntered === true || (!!oldIntruder && insideTerritory(oldIntruder, scenario));
  const available = state.units.map((u) => ({ ...u, supply: 100 }));
  const commanded = botEnabled ? available.map((u) => u.id === rules.intruderId && u.hp > 0 && (state.seconds % 10 === 0 || !u.target)
    ? steerIntruder(u, available, scenario, entered) : u) : available;
  const units = tickUnits(commanded, 1, scenario.terrain, { supplyDisabled: true, combatDisabled: true }).map((u) => {
    if (u.id !== rules.intruderId || !entered || !oldIntruder || segmentInPolygon(oldIntruder, u, rules.territory.polygon)) return u;
    // Reject even a manual route leaving the play area after the first entry.
    return { ...u, lat: oldIntruder.lat, lng: oldIntruder.lng, target: undefined, route: undefined, patrol: undefined, order: "Выход за границу запрещён" };
  });
  const intruder = units.find((u) => u.id === rules.intruderId);
  const borderEntered = entered || (!!intruder && insideTerritory(intruder, scenario));
  const seconds = state.seconds + 1;
  const captured = intruder && borderEntered && units.some((u) => u.side === "blue" && u.hp > 0 && distanceKm(u, intruder) <= rules.captureRadiusKm);
  const escaped = intruder && borderEntered && distanceKm(intruder, scenario.objectives[0]) <= scenario.objectives[0].radiusKm;
  const borderOutcome = captured ? "captured" : escaped ? "escaped" : seconds >= scenario.timeLimitSeconds ? "timeout" : undefined;
  return {
    ...state, units: units.map((u) => borderOutcome && u.id === rules.intruderId
      ? { ...u, target: undefined, route: undefined, patrol: undefined, order: borderOutcome === "captured" ? "Задержан" : borderOutcome === "escaped" ? "Достиг Петропавла" : "Время истекло" } : u),
    seconds, borderEntered, borderOutcome,
    lastKnownIntruder: intruder && intruderVisible(units, scenario) ? { lat: intruder.lat, lng: intruder.lng, seconds } : state.lastKnownIntruder,
    winner: borderOutcome === "captured" ? "blue" : borderOutcome === "escaped" ? "red" : borderOutcome === "timeout" ? "draw" : undefined,
  };
}
