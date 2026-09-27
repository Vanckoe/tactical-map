import { test, expect } from "bun:test";
import { getScenario } from "../src/lib/scenarios.ts";
import { newBattle, startScenario, tickBattle } from "../src/lib/battle.ts";
import { intruderVisible } from "../src/lib/border-patrol.ts";
import { distanceKm, pointInPolygon, segmentInPolygon } from "../src/lib/geo.ts";
import { offset } from "../src/lib/terrain.ts";
import { beginTransportOperation, validTransportState, TRANSFER_SECONDS } from "../src/lib/transport.ts";
import { tickUnits } from "../src/lib/simulation.ts";

const scenario = getScenario("bulaevo-lost-trail");
const city = scenario.objectives[0];
const rules = scenario.borderPatrol;

test("all starts give comparable escape times and a useful reserve arrival window", () => {
  const arrivalTimes = [];
  const carrier = scenario.units.find((u) => u.kind === "transport");
  expect(segmentInPolygon(carrier, city, rules.territory.polygon)).toBe(true);
  const reserveReady = distanceKm(carrier, city) / 100 * 3600 + TRANSFER_SECONDS;
  for (let i = 0; i < rules.starts.length; i++) {
    let state = startScenario(scenario, () => i / rules.starts.length);
    const intruder = state.units.find((u) => u.id === rules.intruderId);
    expect(pointInPolygon(intruder, rules.searchArea)).toBe(true);
    expect(intruderVisible(state.units, scenario)).toBe(false);
    // Idle guards must not earn an automatic win.
    while (!state.winner) state = tickBattle(state, 100, true);
    expect(state.borderOutcome).toBe("escaped");
    expect(state.seconds).toBeLessThan(scenario.timeLimitSeconds);
    expect(state.seconds - reserveReady).toBeGreaterThan(20 * 60);
    arrivalTimes.push(state.seconds);
  }
  expect(Math.max(...arrivalTimes) - Math.min(...arrivalTimes)).toBeLessThan(5 * 60);
});

test("the intruder does not evade a guard beyond its scenario observation radius", () => {
  const intruder = { ...scenario.units.find((u) => u.side === "red"), ...offset(city, 0, 20) };
  const guard = { ...scenario.units[0], ...offset(intruder, 0, -2) };
  const next = tickBattle(newBattle([guard, intruder], scenario.id), 1, true);
  expect(intruderVisible([guard, intruder], scenario)).toBe(false);
  expect(next.units.find((u) => u.side === "red").target).toEqual([city.lat, city.lng]);
});

test("a squad can catch a detected intruder using only current observations", () => {
  const intruder = { ...scenario.units.find((u) => u.side === "red"), ...offset(city, 0, 20) };
  const guard = { ...scenario.units[0], ...offset(intruder, 0, 1.3) };
  let state = newBattle([guard, intruder], scenario.id);
  while (!state.winner && state.seconds < 20 * 60) {
    if (intruderVisible(state.units, scenario)) {
      const contact = state.units.find((u) => u.side === "red");
      state.units = state.units.map((u) => u.side === "blue"
        ? { ...u, target: [contact.lat, contact.lng], route: undefined } : u);
    }
    state = tickBattle(state, 10, true);
  }
  expect(state.borderOutcome).toBe("captured");
  expect(state.units.every((u) => u.hp === 100)).toBe(true);
});

test("scenario movement speeds apply in manual mode and accelerated playback", () => {
  const intruder = { ...scenario.units.find((u) => u.side === "red"), ...offset(city, 0, 20), target: [city.lat, city.lng] };
  const guard = { ...scenario.units[0], ...offset(city, 5, 20), target: [city.lat, city.lng + 0.1] };
  const initial = newBattle([guard, intruder], scenario.id);
  const fast = tickBattle(initial, 60, false);
  let slow = initial;
  for (let i = 0; i < 60; i++) slow = tickBattle(slow, 1, false);
  expect(fast).toEqual(slow);
  expect(distanceKm(intruder, fast.units[1])).toBeCloseTo(24 / 60, 4);
  expect(distanceKm(guard, fast.units[0])).toBeCloseTo(28 / 60, 4);
});

test("squads can unload, board again, and restore during either operation", () => {
  let units = scenario.units.filter((u) => u.carrierId || u.kind === "transport");
  for (const operation of ["disembark", "board"]) {
    units = beginTransportOperation(units, "7", operation, ["4", "5", "6"], { polygon: rules.territory.polygon });
    expect(validTransportState(units)).toBe(true);
    units = tickUnits(units, 150, [], { supplyDisabled: true, combatDisabled: true });
    units = JSON.parse(JSON.stringify(units));
    expect(validTransportState(units)).toBe(true);
    units = tickUnits(units, 150, [], { supplyDisabled: true, combatDisabled: true });
    expect(validTransportState(units)).toBe(true);
    expect(units.filter((u) => u.carrierId)).toHaveLength(operation === "board" ? 3 : 0);
  }
});
