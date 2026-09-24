import { test, expect } from "bun:test";
import { tickUnits } from "../src/lib/simulation.ts";
import { tickBattle, newBattle } from "../src/lib/battle.ts";
import { getScenario } from "../src/lib/scenarios.ts";
import { distanceKm } from "../src/lib/geo.ts";
const a = [0, 0.01], b = [0, 0.02];
const patrol = () => ({ id: "p", name: "patrol", kind: "infantry", echelon: "Взвод", side: "blue", lat: 0, lng: 0, hp: 100, supply: 100, order: "Выход на маршрут патруля", target: a, patrol: { points: [a, b], next: 0, started: false } });

test("unit first approaches A, then alternates B and A without teleporting", () => {
  let u = patrol();
  const targets = [];
  for (let i = 0; i < 1000 && targets.length < 3; i++) {
    const next = tickUnits([u], 1)[0];
    expect(distanceKm(u, next)).toBeLessThan(0.02);
    if (next.patrol.next !== u.patrol.next) targets.push(next.target);
    if (!next.patrol.started) expect(next.order).toBe("Выход на маршрут патруля");
    u = next;
  }
  expect(targets).toEqual([b, a, b]);
  expect(u.order).toBe("Патрулирование");
});

test("patrol continues after serialization and does not depend on speed", () => {
  const state = tickUnits([patrol()], 200);
  expect(tickUnits(JSON.parse(JSON.stringify(state)), 100)).toEqual(tickUnits(state, 100));
  let slow = state;
  for (let i = 0; i < 100; i++) slow = tickUnits(slow, 1);
  expect(tickUnits(state, 100)).toEqual(slow);
});

test("holding or moving elsewhere clears the patrol; exhausted units cannot patrol", () => {
  const u = tickUnits([patrol()], 200)[0];
  const held = { ...u, target: undefined, route: undefined, patrol: undefined, advance: false };
  const stopped = tickUnits([held], 100)[0];
  expect(stopped.lng).toBe(held.lng);
  expect(stopped.target).toBeUndefined();
  const moved = tickUnits([{ ...u, patrol: undefined, route: undefined, target: [u.lat, u.lng + 0.0001] }], 100)[0];
  expect(moved.target).toBeUndefined();
  expect(moved.patrol).toBeUndefined();
  const empty = { ...u, supply: 0 };
  expect(tickUnits([empty], 100)[0].lng).toBe(empty.lng);
});

test("both patrol legs route around water", () => {
  const zones = [{ id: "lake", label: "lake", type: "water", lat: 0, lng: 0.015, radiusKm: 0.3 }];
  let u = { ...patrol(), lng: a[1] };
  let reversals = 0;
  for (let i = 0; i < 1500 && reversals < 3; i++) {
    const next = tickUnits([u], 1, zones)[0];
    expect(distanceKm(next, zones[0])).toBeGreaterThanOrEqual(zones[0].radiusKm);
    if (next.patrol.next !== u.patrol.next) reversals++;
    u = next;
  }
  expect(reversals).toBe(3);
});

test("patrol works with supply disabled in the border scenario", () => {
  const scenario = getScenario("petropavl-border");
  const guard = scenario.units[0];
  const points = [[guard.lat, guard.lng + 0.001], [guard.lat, guard.lng + 0.003]];
  const units = scenario.units.map((u) => u.id === guard.id ? { ...u, supply: 0, target: points[0], patrol: { points, next: 0, started: false } } : u);
  const result = tickBattle(newBattle(units, scenario.id), 100, false);
  const current = result.units.find((u) => u.id === guard.id);
  expect(current.patrol.started).toBe(true);
  expect(current.supply).toBe(100);
  expect(current.order).toBe("Патрулирование");
});
