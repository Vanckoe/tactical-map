import { detectedBySide, tickUnits, type Unit } from "./simulation";
import { UNIT_PROFILES, damageMultiplier } from "./unit-balance";
import { distanceKm, moveToward, type Position } from "./geo";
import { planRoute } from "./terrain";
import { getScenario, type Scenario } from "./scenarios";
import { insideTerritory, tickBorderPatrol } from "./border-patrol";
export type PointState = { owner: "blue" | "red" | null; progress: number; contested: boolean };
export type Battle = { units: Unit[]; seconds: number; scenarioId: string; points: Record<string, PointState>; cityHeldSeconds: number; releasedReserves: string[]; winner?: "blue" | "red" | "draw"; borderEntered?: boolean; borderOutcome?: "captured" | "escaped" | "timeout"; lastKnownIntruder?: Position & { seconds: number } };
export function newBattle(units: Unit[], scenarioId = "sandbox"): Battle {
  const scenario = getScenario(scenarioId);
  const defender = scenario?.attackerSide === "blue" ? "red" : "blue";
  return { units: units.map((u) => ({ ...u, supply: scenario?.supplyDisabled ? 100 : u.supply })), scenarioId, seconds: 0, cityHeldSeconds: 0, releasedReserves: [],
    ...(scenario?.borderPatrol ? { borderEntered: units.some((u) => u.id === scenario.borderPatrol!.intruderId && insideTerritory(u, scenario)) } : {}),
    points: Object.fromEntries((scenario?.objectives ?? []).map((o) => [o.id, { owner: defender, progress: defender === "blue" ? 15 : -15, contested: false }])) };
}
const canCapture = (u: Unit) => u.hp > 0 && u.supply > 0 && !UNIT_PROFILES[u.kind].airborne && UNIT_PROFILES[u.kind].damagePerSecond > 0;
function orderTo(u: Unit, destination: Position, scenario: Scenario, advance = false): Unit {
  if (distanceKm(u, destination) < 0.35) return u.target ? { ...u, target: undefined, route: undefined, advance: false } : u;
  if (u.target && distanceKm({ lat: u.target[0], lng: u.target[1] }, destination) < 0.5) return u;
  const route = planRoute(u, destination, scenario.terrain, UNIT_PROFILES[u.kind].airborne);
  if (!route.length) return u;
  return { ...u, target: [destination.lat, destination.lng], route, advance, stationarySeconds: 0, entrenchment: 0, order: "Приказ бота" };
}
/** Objective-based game AI. Only detected enemies influence decisions. No bonus stats. */
export function commandEnemy(units: Unit[], scenario: Scenario, points: Battle["points"]): Unit[] {
  const red = units.filter((u) => u.side === "red" && u.hp > 0).sort((a,b) => a.id.localeCompare(b.id));
  const visible = units.filter((u) => u.side === "blue" && u.hp > 0 && detectedBySide(u, "red", units));
  const frontline = red.filter((u) => ["infantry", "armor", "antitank", "recon"].includes(u.kind));
  const assigned = new Map<string, number>();
  const updated = new Map<string, Unit>();
  for (const u of red) {
    const p = UNIT_PROFILES[u.kind];
    if (!u.supply) continue;
    const original = scenario.units.find((initial) => initial.id === u.id);
    if (scenario.attackerSide !== "red" && original) {
      // The initial garrison holds its dispersed positions instead of chasing attackers.
      updated.set(u.id, orderTo(u, original, scenario));
      continue;
    }
    const supply = red.find((other) => other.kind === "logistics" && other.supply > 5);
    if (u.supply < 20 || u.hp < 30) {
      updated.set(u.id, orderTo(u, supply && supply.id !== u.id ? supply : scenario.redBase, scenario)); continue;
    }
    const firingTarget = visible.some((enemy) => damageMultiplier(u.kind, enemy.kind) > 0 && distanceKm(u, enemy) <= p.rangeKm && distanceKm(u, enemy) >= p.minRangeKm);
    if (firingTarget && !u.target) continue; // Preserve an established firing position.
    if (["logistics", "medical", "engineer", "ew", "airdefense"].includes(u.kind)) {
      const ally = [...frontline].sort((a,b) => (u.kind === "logistics" ? a.supply - b.supply : u.kind === "medical" ? a.hp - b.hp : 0) || distanceKm(u,a) - distanceKm(u,b))[0];
      if (ally) {
        const destination = moveToward(ally, scenario.redBase, Math.min(0.7, distanceKm(ally,scenario.redBase)));
        updated.set(u.id, orderTo(u, destination, scenario));
      }
      continue;
    }
    const goals = [...scenario.objectives].sort((a,b) => {
      const cost = (o: typeof a) => distanceKm(u,o) + (assigned.get(o.id) ?? 0) * 4 + (points[o.id]?.owner === "red" ? 2 : 0) + visible.filter((e) => distanceKm(e,o) < 1).length * 0.8;
      return cost(a) - cost(b) || a.id.localeCompare(b.id);
    });
    const objective = goals[0];
    assigned.set(objective.id, (assigned.get(objective.id) ?? 0) + 1);
    const destination = u.kind === "artillery" ? moveToward(objective, scenario.redBase, Math.min(3.5, distanceKm(objective,scenario.redBase))) : objective;
    updated.set(u.id, orderTo(u, destination, scenario, p.damagePerSecond > 0));
  }
  return units.map((u) => updated.get(u.id) ?? u);
}
export function tickBattle(state: Battle, elapsed: number, botEnabled: boolean): Battle {
  if (state.winner || !Number.isFinite(elapsed) || elapsed <= 0) return state;
  let next = state;
  const scenario = getScenario(state.scenarioId);
  for (let second = 0; second < elapsed && !next.winner; second++) {
    if (scenario?.borderPatrol) {
      next = tickBorderPatrol(next, scenario, botEnabled);
      continue;
    }
    const seconds = next.seconds + 1;
    const releasedReserves = [...next.releasedReserves];
    let available = next.units;
    for (const wave of scenario?.reserves ?? []) {
      if (seconds >= wave.releaseSeconds && !releasedReserves.includes(wave.id)) {
        available = [...available, ...wave.units.map((u) => ({ ...u }))];
        releasedReserves.push(wave.id);
      }
    }
    const commanded = botEnabled && scenario && (next.seconds % 10 === 0 || available !== next.units) ? commandEnemy(available, scenario, next.points) : available;
    const units = tickUnits(commanded, 1, scenario?.terrain, { supplyDisabled: scenario?.supplyDisabled });
    const points = { ...next.points };
    if (scenario) for (const objective of scenario.objectives) {
      const present = units.filter((u) => canCapture(u) && distanceKm(u,objective) <= objective.radiusKm);
      const blue = present.some((u) => u.side === "blue"), red = present.some((u) => u.side === "red");
      const old = points[objective.id] ?? { owner: null, progress: 0, contested: false };
      const progress = Math.max(-15, Math.min(15, old.progress + (blue && !red ? 1 : red && !blue ? -1 : 0)));
      const owner = progress === 15 ? "blue" : progress === -15 ? "red" : old.owner;
      points[objective.id] = { owner, progress, contested: blue && red };
    }
    let winner: Battle["winner"];
    let cityHeldSeconds = next.cityHeldSeconds;
    if (scenario) {
      const attacker = scenario.attackerSide;
      const defender = attacker === "blue" ? "red" : "blue";
      const occupied = scenario.objectives.every((o) => points[o.id]?.owner === attacker && !points[o.id]?.contested && units.some((u) => canCapture(u) && u.side === attacker && distanceKm(u, o) <= o.radiusKm));
      cityHeldSeconds = occupied ? cityHeldSeconds + 1 : 0;
      const attackersAlive = units.some((u) => u.side === attacker && u.hp > 0 && !UNIT_PROFILES[u.kind].airborne && UNIT_PROFILES[u.kind].damagePerSecond > 0);
      if (cityHeldSeconds >= scenario.holdSeconds) winner = attacker;
      else if (seconds >= scenario.timeLimitSeconds || !attackersAlive) winner = defender;
    }
    next = { ...next, units, seconds, points, cityHeldSeconds, releasedReserves, winner };
  }
  return next;
}
