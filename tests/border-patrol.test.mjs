import { test, expect } from "bun:test";
import { getScenario } from "../src/lib/scenarios.ts";
import { newBattle, tickBattle, resumeBotControl } from "../src/lib/battle.ts";
import { insideTerritory, intruderVisible, observedUnits } from "../src/lib/border-patrol.ts";
import { offset } from "../src/lib/terrain.ts";
import { tickUnits } from "../src/lib/simulation.ts";
const scenario = getScenario("petropavl-border");
const intruder = scenario.units.find((u) => u.side === "red");
const guard = scenario.units[0];

test("manual control reveals live enemies and orders without recording a false contact", () => {
  const state = newBattle(scenario.units, scenario.id);
  const red = state.units.find((u) => u.side === "red");
  red.target = [red.lat, red.lng + 0.01];
  expect(observedUnits(state, scenario, true).some((u) => u.side === "red")).toBe(false);
  const manual = observedUnits(state, scenario, false);
  expect(manual).toEqual(state.units);
  expect(manual.find((u) => u.side === "red").contactLost).toBeUndefined();
  expect(state.lastKnownIntruder).toBeUndefined();
  expect(observedUnits(state, scenario, true).some((u) => u.side === "red")).toBe(false);
  const remembered = { ...state, lastKnownIntruder: { lat: red.lat, lng: red.lng - 0.02, seconds: 0 } };
  expect(observedUnits(remembered, scenario, false).find((u) => u.side === "red").lng).toBe(red.lng);
  const stale = observedUnits(remembered, scenario, true).find((u) => u.side === "red");
  expect(stale.contactLost).toBe(true);
  expect(stale.lng).toBe(remembered.lastKnownIntruder.lng);
});

test("resuming the bot cancels manual enemy patrol and restores AI without advancing time", () => {
  const state = newBattle(scenario.units, scenario.id);
  state.seconds = 3;
  const red = state.units.find((u) => u.side === "red");
  red.target = [red.lat, red.lng - 0.1];
  red.patrol = { points: [red.target, [red.lat, red.lng]], next: 0, started: false };
  const resumed = resumeBotControl(state);
  expect(resumed.seconds).toBe(3);
  expect(resumed.units.filter((u) => u.side === "blue")).toEqual(state.units.filter((u) => u.side === "blue"));
  expect(resumed.units.find((u) => u.side === "red").patrol).toBeUndefined();
  const next = tickBattle(resumed, 1, true).units.find((u) => u.side === "red");
  expect(next.target).toEqual([scenario.borderPatrol.entry.lat, scenario.borderPatrol.entry.lng]);
  expect(next.lng).toBeGreaterThan(red.lng);
});

test("intruder starts hidden, detection uses the configured radius and capture stays 600 m", () => {
  expect(observedUnits(newBattle(scenario.units, scenario.id), scenario).every((u) => u.side === "blue")).toBe(true);
  expect(scenario.borderPatrol.captureRadiusKm).toBe(0.6);
  const observer = { ...guard, ...scenario.borderPatrol.entry };
  const near = { ...intruder, ...offset(observer, scenario.borderPatrol.detectionRadiusKm - 0.01, 0) };
  const far = { ...intruder, ...offset(observer, scenario.borderPatrol.detectionRadiusKm + 0.01, 0) };
  expect(intruderVisible([observer, near], scenario)).toBe(true);
  expect(intruderVisible([observer, far], scenario)).toBe(false);
  expect(intruderVisible([{ ...observer, hp: 0 }, near], scenario)).toBe(false);
  expect(tickBattle(newBattle([observer, near], scenario.id), 1, false).winner).toBeUndefined();
});

test("lost contact freezes position, hides route, survives save and updates on reacquisition", () => {
  const observer = { ...guard, ...scenario.borderPatrol.entry };
  const near = { ...intruder, ...offset(observer, scenario.borderPatrol.detectionRadiusKm * 0.8, 0) };
  const seen = tickBattle(newBattle([observer, near], scenario.id), 1, false);
  const far = { ...near, ...offset(observer, 6, 0), target: [55.005, 69] };
  const lost = tickBattle({ ...seen, units: [observer, far] }, 50, false);
  expect(lost.lastKnownIntruder).toEqual(seen.lastKnownIntruder);
  const marker = observedUnits(lost, scenario).find((u) => u.side === "red");
  expect(marker.contactLost).toBe(true);
  expect(marker.lat).toBe(near.lat);
  expect(marker.lng).toBe(near.lng);
  expect(marker.target).toBeUndefined();
  expect(marker.route).toBeUndefined();
  expect(observedUnits(JSON.parse(JSON.stringify(lost)), scenario)).toEqual(observedUnits(lost, scenario));
  const actual = lost.units.find((u) => u.side === "red");
  const found = tickBattle({ ...lost, units: [{ ...observer, ...offset(actual, -scenario.borderPatrol.detectionRadiusKm * 0.8, 0) }, actual] }, 1, false);
  const refreshed = observedUnits(found, scenario).find((u) => u.side === "red");
  expect(refreshed.contactLost).not.toBe(true);
  expect(refreshed.lng).toBe(found.units.find((u) => u.side === "red").lng);
  expect(refreshed.target).toBeUndefined();
});

test("last observation is identical at 1x and 50x when contact is lost mid-update", () => {
  const observer = { ...guard, ...scenario.borderPatrol.entry };
  const near = { ...intruder, ...offset(observer, scenario.borderPatrol.detectionRadiusKm - 0.1, 0), target: [55.005, 69] };
  const state = newBattle([observer, near], scenario.id);
  let slow = state;
  for (let i = 0; i < 50; i++) slow = tickBattle(slow, 1, false);
  const fast = tickBattle(state, 50, false);
  expect(fast).toEqual(slow);
  expect(fast.lastKnownIntruder).toBeDefined();
  expect(observedUnits(fast, scenario).find((u) => u.side === "red").contactLost).toBe(true);
});

test("border scenario has three outposts of three platoons and one squad", () => {
  expect(scenario.units).toHaveLength(10);
  for (const post of scenario.borderPatrol.outposts) {
    const units = scenario.units.filter((u) => u.name.startsWith(post.name));
    expect(units).toHaveLength(3);
    expect(units.every((u) => u.kind === "infantry" && u.echelon === "Взвод" && u.side === "blue")).toBe(true);
  }
  expect(intruder.echelon).toBe("Отделение");
  expect(insideTerritory(intruder, scenario)).toBe(false);
});

test("close contact captures without damage; merely being in weapon range does not", () => {
  const atEntry = { ...intruder, ...scenario.borderPatrol.entry };
  const close = { ...guard, lat: atEntry.lat, lng: atEntry.lng + 0.002 };
  const state = newBattle([atEntry, close], scenario.id);
  const captured = tickBattle(state, 50, true);
  expect(captured.winner).toBe("blue");
  expect(captured.borderOutcome).toBe("captured");
  expect(captured.units.every((u) => u.hp === 100)).toBe(true);
  expect(captured.seconds).toBe(1);
  expect(tickBattle(captured, 50, true)).toBe(captured);
  const separated = newBattle([atEntry, { ...close, lng: atEntry.lng + 0.01 }], scenario.id);
  const waiting = tickBattle(separated, 50, false);
  expect(waiting.winner).toBeUndefined();
  expect(waiting.units.every((u) => u.hp === 100)).toBe(true);
});

test("city arrival wins immediately but simultaneous capture takes precedence", () => {
  const arrival = { ...intruder, ...scenario.objectives[0], id: intruder.id };
  const state = newBattle([arrival], scenario.id);
  expect(tickBattle(state, 1, false).borderOutcome).toBe("escaped");
  const contested = newBattle([arrival, { ...guard, lat: arrival.lat, lng: arrival.lng }], scenario.id);
  expect(tickBattle(contested, 1, false).borderOutcome).toBe("captured");
});

test("entry is remembered through serialization and blocks exit with manual orders", () => {
  const state = newBattle([{ ...intruder, lng: scenario.borderPatrol.territory.west - 0.00001, target: [intruder.lat, 68.23] }], scenario.id);
  const entered = tickBattle(state, 1, false);
  expect(entered.borderEntered).toBe(true);
  const saved = JSON.parse(JSON.stringify(entered));
  saved.units[0].target = [intruder.lat, 68.18];
  saved.units[0].route = undefined;
  const after = tickBattle(saved, 50, false);
  expect(insideTerritory(after.units[0], scenario)).toBe(true);
  expect(after.borderEntered).toBe(true);
  expect(after.units[0].target).toBeUndefined();
});

test("zero supply has no effect on either side in the border scenario", () => {
  const low = newBattle(scenario.units, scenario.id);
  low.units = low.units.map((u) => ({ ...u, supply: 0, target: [u.lat, u.lng + 0.02] }));
  const full = { ...low, units: low.units.map((u) => ({ ...u, supply: 100 })) };
  expect(tickBattle(low, 50, false)).toEqual(tickBattle(full, 50, false));
  expect(tickBattle(low, 50, false).units.every((u) => u.supply === 100)).toBe(true);
  const normal = tickUnits([low.units[0]], 50);
  expect(normal[0].lng).toBe(low.units[0].lng);
});

test("border bot and entry are independent of playback speed", () => {
  const state = newBattle(scenario.units, scenario.id);
  let slow = state;
  for (let i = 0; i < 50; i++) slow = tickBattle(slow, 1, true);
  expect(tickBattle(state, 50, true)).toEqual(slow);
});

test("unopposed bot enters once, stays inside and reaches the city", () => {
  let state = newBattle([intruder], scenario.id);
  while (!state.winner && state.seconds < scenario.timeLimitSeconds) {
    state = tickBattle(state, 50, true);
    if (state.borderEntered) expect(insideTerritory(state.units[0], scenario)).toBe(true);
  }
  expect(state.winner).toBe("red");
  expect(state.borderOutcome).toBe("escaped");
});

test("expiry without capture or arrival is a draw", () => {
  const state = { ...newBattle(scenario.units, scenario.id), seconds: scenario.timeLimitSeconds - 1 };
  const result = tickBattle(state, 1, false);
  expect(result.winner).toBe("draw");
  expect(result.borderOutcome).toBe("timeout");
});

test("intruder avoids detected guards without using hidden guard positions", () => {
  const entered = { ...intruder, ...scenario.borderPatrol.entry };
  const alone = tickBattle(newBattle([entered], scenario.id), 1, true).units[0];
  const hiddenGuard = { ...guard, lat: 54.75, lng: 69.3 };
  const hidden = tickBattle(newBattle([entered, hiddenGuard], scenario.id), 1, true).units[0];
  expect(hidden).toEqual(alone);
  const nearbyGuard = { ...guard, lat: entered.lat, lng: entered.lng + 0.02 };
  const avoiding = tickBattle(newBattle([entered, nearbyGuard], scenario.id), 1, true).units[0];
  expect(avoiding.target).not.toEqual(alone.target);
  expect(insideTerritory({ lat: avoiding.target[0], lng: avoiding.target[1] }, scenario)).toBe(true);
});

test("the complete default scenario is winnable by a bot against idle outposts", () => {
  const result = tickBattle(newBattle(scenario.units, scenario.id), scenario.timeLimitSeconds, true);
  expect(result.borderOutcome).toBe("escaped");
  expect(result.units.every((u) => u.hp === 100 && u.supply === 100)).toBe(true);
});
