import { test, expect } from "bun:test";
import { tickUnits, detectedBySide } from "../src/lib/simulation.ts";
import { beginTransportOperation, cancelTransportOperation, releaseTransport, validTransportState, passengersOf } from "../src/lib/transport.ts";
import { newBattle, tickBattle, startScenario } from "../src/lib/battle.ts";
import { getScenario } from "../src/lib/scenarios.ts";
import { observedUnits, insideTerritory, intruderVisible } from "../src/lib/border-patrol.ts";
import { distanceKm, segmentInPolygon } from "../src/lib/geo.ts";
import { offset, terrainAt } from "../src/lib/terrain.ts";
const carrier = { id: "t", name: "Транспорт", kind: "transport", echelon: "Взвод", side: "blue", lat: 54.9, lng: 70.4, hp: 100, supply: 100, order: "Удержание" };
const platoon = (id, extra = {}) => ({ ...carrier, id, kind: "infantry", ...extra });
const rules = { supplyDisabled: true, combatDisabled: true };
const scenario = getScenario("bulaevo-lost-trail");

test("capacity, distance, affiliation and platoon restrictions are enforced atomically", () => {
  const units = [carrier, ...Array.from({ length: 6 }, (_, i) => platoon(String(i)))];
  expect(beginTransportOperation(units, "t", "board", ["0", "1", "2", "3", "4", "5"])).toBe(units);
  const begun = beginTransportOperation(units, "t", "board", ["0", "1", "2", "3", "4"]);
  expect(begun[0].transportOperation.remainingSeconds).toBe(300);
  expect(beginTransportOperation(begun, "t", "board", ["5"])).toBe(begun);
  const full = tickUnits(begun, 300, [], rules);
  expect(passengersOf(full, "t")).toHaveLength(5);
  expect(beginTransportOperation(full, "t", "board", ["5"])).toBe(full);
  for (const extra of [{ side: "red" }, { kind: "armor" }, { echelon: "Рота" }, { lat: 55 }, { hp: 0 }, { kind: "transport" }]) {
    const bad = [carrier, platoon("p", extra)];
    expect(beginTransportOperation(bad, "t", "board", ["p"])).toBe(bad);
  }
  expect(beginTransportOperation(units, "t", "board", ["0", "0"])).toBe(units);
});

test("boarding and disembarking take exactly 300 seconds and can be cancelled", () => {
  const initial = [carrier, platoon("p", { target: [55, 70.5] })];
  const begun = beginTransportOperation(initial, "t", "board", ["p"]);
  const almost = tickUnits(begun, 299, [], rules);
  expect(almost[1].carrierId).toBeUndefined();
  expect(almost[1].lat).toBe(carrier.lat);
  expect(almost[0].transportOperation.remainingSeconds).toBe(1);
  const cancelled = cancelTransportOperation(almost, "t");
  expect(cancelled[1].carrierId).toBeUndefined();
  expect(cancelled[0].transportOperation).toBeUndefined();
  const loaded = tickUnits(almost, 1, [], rules);
  expect(loaded[1].carrierId).toBe("t");
  const leaving = beginTransportOperation(loaded, "t", "disembark", ["p"]);
  expect(cancelTransportOperation(leaving, "t")[1].carrierId).toBe("t");
  expect(tickUnits(leaving, 299, [], rules)[1].carrierId).toBe("t");
  const out = tickUnits(leaving, 300, [], rules);
  expect(out[1].carrierId).toBeUndefined();
  expect(distanceKm(out[0], out[1])).toBeLessThan(0.1);
  expect(out[1].order).toBe("Удержание");
});

test("transport covers 10 km in 6 minutes with or without passengers", () => {
  const destination = offset(carrier, 20, 0);
  const moving = { ...carrier, target: [destination.lat, destination.lng] };
  const empty = tickUnits([moving], 360, [], rules)[0];
  const loaded = tickUnits([moving, platoon("p", { carrierId: "t" })], 360, [], rules);
  expect(distanceKm(carrier, empty)).toBeCloseTo(10, 4);
  expect(loaded[0]).toEqual(empty);
  expect(loaded[1].lat).toBe(empty.lat);
  expect(loaded[1].lng).toBe(empty.lng);
});

test("saved mid-operation and 1x/100x playback agree without duplicating units", () => {
  const begun = beginTransportOperation([carrier, platoon("p")], "t", "board", ["p"]);
  let slow = newBattle(begun), fast = newBattle(begun);
  for (let i = 0; i < 300; i++) slow = tickBattle(slow, 1, false);
  for (let i = 0; i < 3; i++) fast = tickBattle(fast, 100, false);
  expect(slow).toEqual(fast);
  const saved = JSON.parse(JSON.stringify(tickBattle(newBattle(begun), 117, false)));
  expect(validTransportState(saved.units)).toBe(true);
  expect(tickBattle(saved, 183, false)).toEqual(fast);
  expect(tickBattle(saved, 0, false)).toBe(saved);
  expect(fast.units).toHaveLength(2);
});

test("passengers cannot observe, fight, or independently capture", () => {
  const passenger = platoon("p", { carrierId: "t", lat: 55.2, lng: 70.5 });
  const enemy = platoon("enemy", { side: "red", lat: 55.2, lng: 70.5 });
  expect(detectedBySide(enemy, "blue", [carrier, passenger, enemy])).toBe(false);
  const fought = tickUnits([carrier, passenger, enemy], 20, [], { supplyDisabled: true });
  expect(fought.find((u) => u.id === "enemy").hp).toBe(100);
  const intruder = { ...scenario.units.at(-1), ...carrier };
  Object.assign(intruder, { id: "8", kind: "infantry", echelon: "Отделение", side: "red" });
  const battle = newBattle([carrier, platoon("p", { carrierId: "t" }), intruder], scenario.id);
  expect(tickBattle(battle, 1, false).borderOutcome).toBeUndefined();
  expect(observedUnits(battle, scenario).some((u) => u.id === "p")).toBe(false);
  expect(tickBattle({ ...battle, units: beginTransportOperation(battle.units, "t", "disembark", ["p"]) }, 300, false).borderOutcome).toBe("captured");
});

test("deletion and destruction release passengers; landing avoids water and territory exterior", () => {
  const units = [carrier, platoon("p", { carrierId: "t" })];
  expect(releaseTransport(units, "t")[1].carrierId).toBeUndefined();
  expect(tickUnits([{ ...carrier, hp: 0 }, units[1]], 1, [], rules)[1].hp).toBe(100);
  expect(tickUnits([{ ...carrier, hp: 0 }, units[1]], 1, [], rules)[1].carrierId).toBeUndefined();
  const water = [{ id: "lake", label: "Lake", type: "water", ...offset(carrier, 0.04, 0), radiusKm: 0.02 }];
  const polygon = [[54.8, 70.3], [54.8, 70.4], [55, 70.4], [55, 70.3]];
  const begun = beginTransportOperation(units, "t", "disembark", ["p"], { terrain: water, polygon });
  const landed = tickUnits(begun, 300, water, { ...rules, territory: polygon })[1];
  expect(landed.lng).toBeLessThanOrEqual(70.4);
  expect(terrainAt(landed, water)).not.toBe("water");
});

test("malformed transport saves are rejected, legacy saves remain valid", () => {
  expect(validTransportState([carrier, platoon("p")])).toBe(true);
  for (const units of [[platoon("p", { carrierId: "missing" })], [carrier, platoon("p", { carrierId: "t", side: "red" })], [carrier, ...Array.from({ length: 6 }, (_, i) => platoon(String(i), { carrierId: "t" }))], [{ ...carrier, transportOperation: { type: "board", unitIds: ["p", "p"], remainingSeconds: 300 } }, platoon("p")]]) expect(validTransportState(units)).toBe(false);
});

test("lost trail starts with three deployed platoons and three passengers in Petropavl", () => {
  const state = startScenario(scenario, () => 0.5);
  expect(state.units.filter((u) => u.side === "blue" && u.kind === "infantry" && !u.carrierId)).toHaveLength(3);
  expect(passengersOf(state.units, "7")).toHaveLength(3);
  expect(validTransportState(state.units)).toBe(true);
  expect(state.borderEntered).toBe(true);
  expect(intruderVisible(state.units, scenario)).toBe(false);
  expect(state.units.find((u) => u.id === "8").lng).toBe(scenario.borderPatrol.starts[1].lng);
  const loaded = newBattle(JSON.parse(JSON.stringify(state.units)), scenario.id);
  expect(loaded.units).toEqual(state.units);
  for (const u of state.units) expect(insideTerritory(u, scenario)).toBe(true);
  const base = state.units.find((u) => u.id === "7");
  for (const post of scenario.borderPatrol.outposts) expect(segmentInPolygon(base, post, scenario.borderPatrol.territory.polygon)).toBe(true);
});

test("every hidden start is reachable and unopposed bot reaches Bulaevo within the limit", () => {
  for (let i = 0; i < 3; i++) {
    let state = startScenario(scenario, () => i / 3);
    expect(intruderVisible(state.units, scenario)).toBe(false);
    state.units = state.units.filter((u) => u.side === "red");
    while (!state.winner) {
      state = tickBattle(state, 100, true);
      expect(insideTerritory(state.units[0], scenario)).toBe(true);
    }
    expect(state.borderOutcome).toBe("escaped");
    expect(state.seconds).toBeLessThan(7200);
  }
});
