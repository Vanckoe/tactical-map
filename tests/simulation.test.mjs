import { test, expect } from "bun:test";
import { tickUnits, detectedBySide } from "../src/lib/simulation.ts";
import { getUnitStats, KIND_IDS } from "../src/lib/unit-balance.ts";
const unit = (id, kind, side = "blue", lng = 0, extra = {}) => ({ id, name: id, kind, side, lat: 0, lng, echelon: "Батальон", hp: 100, supply: 100, order: "Удержание", ...extra });
const byId = (units, id) => units.find((u) => u.id === id);

test("artillery needs a friendly observer and a deployed position", () => {
  const gun = unit("gun", "artillery", "blue", 0, { stationarySeconds: 30 });
  const enemy = unit("enemy", "medical", "red", 0.05);
  expect(byId(tickUnits([gun, enemy], 1), "enemy").hp).toBe(100);
  const scout = unit("scout", "recon", "blue", 0.03);
  expect(byId(tickUnits([gun, scout, enemy], 1), "enemy").hp).toBeLessThan(100);
  expect(byId(tickUnits([{ ...gun, stationarySeconds: 0 }, scout, enemy], 1), "enemy").hp).toBe(100);
});
test("artillery cannot fire inside its minimum range or while moving", () => {
  const gun = unit("gun", "artillery", "blue", 0, { stationarySeconds: 60 });
  expect(tickUnits([gun, unit("enemy", "medical", "red", 0.005)], 1)[1].hp).toBe(100);
  expect(tickUnits([{ ...gun, target: [0, 0.1] }, unit("scout", "recon"), unit("enemy", "medical", "red", 0.05)], 1)[2].hp).toBe(100);
});
test("air defence engages air contacts, never ground forces", () => {
  const aa = unit("aa", "airdefense", "blue", 0, { stationarySeconds: 60 });
  const next = tickUnits([aa, unit("ground", "medical", "red", 0.001), unit("air", "air", "red", 0.08)], 1);
  expect(next[1].hp).toBe(100); expect(next[2].hp).toBeLessThan(100);
});
test("recon drones do not deal damage", () => {
  expect(tickUnits([unit("drone", "drone"), unit("enemy", "medical", "red", 0.001)], 10)[1].hp).toBe(100);
});
test("anti-tank unit prioritizes armour over a nearer soft target", () => {
  const next = tickUnits([unit("at", "antitank", "blue", 0, { stationarySeconds: 20 }), unit("soft", "medical", "red", 0.005), unit("tank", "armor", "red", 0.025)], 1);
  expect(next[1].hp).toBe(100); expect(next[2].hp).toBeLessThan(100);
});
test("supply transfer conserves absolute resources across different unit sizes", () => {
  const input = [unit("supply", "logistics", "blue", 0, { echelon: "Рота", supply: 0.2 }), unit("recipient", "infantry", "blue", 0.001, { supply: 10 })];
  const resources = (us) => us.reduce((sum, u) => sum + u.supply / 100 * getUnitStats(u).supplyCapacity, 0);
  const result = tickUnits(input, 50);
  expect(resources(result)).toBeCloseTo(resources(input), 8);
  expect(result[0].supply).toBe(0); expect(result[1].supply).toBeGreaterThan(10);
  expect(input[0].supply).toBe(0.2);
});
test("supply does not chain between depots or service moving units", () => {
  const next = tickUnits([unit("supply", "logistics"), unit("depot", "logistics", "blue", 0.001, { supply: 10 }), unit("moving", "infantry", "blue", 0.001, { supply: 10, target: [0, 0.1] })], 1);
  expect(next[1].supply).toBe(10); expect(next[2].supply).toBeLessThan(10);
});
test("medical support only restores recoverable losses and never revives units", () => {
  const next = tickUnits([unit("med", "medical"), unit("hurt", "infantry", "blue", 0.001, { hp: 60, recoverableHp: 10 }), unit("dead", "infantry", "blue", 0, { hp: 0, recoverableHp: 20 })], 500);
  expect(next[1].hp).toBeCloseTo(70, 6); expect(next[1].recoverableHp).toBeCloseTo(0, 6); expect(next[2].hp).toBe(0);
});
test("medical support cannot repair tanks", () => {
  expect(tickUnits([unit("med", "medical"), unit("tank", "armor", "blue", 0.001, { hp: 50, recoverableHp: 10 })], 50)[1].hp).toBe(50);
});
test("support pauses if the recipient is under fire", () => {
  const next = tickUnits([unit("supply", "logistics", "blue", -0.01), unit("hurt", "infantry", "blue", 0, { supply: 20 }), unit("enemy", "infantry", "red", 0.001)], 1);
  expect(next[0].order).not.toBe("Снабжение"); expect(next[1].supply).toBeLessThan(20);
});
test("engineers accelerate cover, movement clears it", () => {
  const target = unit("target", "infantry", "blue", 0.001);
  const alone = tickUnits([target], 20)[0];
  const assisted = tickUnits([unit("engineer", "engineer"), target], 20)[1];
  expect(assisted.entrenchment).toBeGreaterThan(alone.entrenchment);
  expect(tickUnits([{ ...assisted, target: [0, 0.1] }], 1)[0].entrenchment).toBe(0);
});
test("deployed EW reduces drone detection and consumes a finite reserve", () => {
  const drone = unit("drone", "drone"), target = unit("target", "medical", "red", 0.07);
  const ew = unit("ew", "ew", "red", 0.04, { stationarySeconds: 20 });
  expect(detectedBySide(target, "blue", [drone, target])).toBe(true);
  expect(detectedBySide(target, "blue", [drone, target, ew])).toBe(false);
  expect(detectedBySide(target, "blue", [drone, target, { ...ew, supply: 0 }])).toBe(true);
  expect(tickUnits([drone, target, ew], 1)[2].supply).toBeLessThan(100);
});
test("attack movement stops at contact; ordinary movement continues", () => {
  const mover = unit("mover", "infantry", "blue", 0, { target: [0, 0.1] }), enemy = unit("enemy", "medical", "red", 0.01);
  expect(tickUnits([{ ...mover, advance: true }, enemy], 1)[0].target).toBeUndefined();
  expect(tickUnits([mover, enemy], 1)[0].lng).toBeGreaterThan(0);
});
test("size changes quantity, not weapon range", () => {
  for (const kind of KIND_IDS) {
    const small = getUnitStats({ kind, echelon: "Взвод" }), large = getUnitStats({ kind, echelon: "Полк" });
    expect(small.rangeKm).toBe(large.rangeKm); expect(small.durability).toBeLessThan(large.durability);
  }
});
test("50x preserves the same result as fifty 1x steps", () => {
  const input = [unit("gun", "artillery"), unit("scout", "recon", "blue", 0.03), unit("enemy", "armor", "red", 0.06), unit("med", "medical"), unit("supply", "logistics", "blue", -0.01), unit("engineer", "engineer")];
  let slow = input;
  for (let i = 0; i < 50; i++) slow = tickUnits(slow, 1);
  expect(tickUnits(input, 50)).toEqual(slow);
  expect(tickUnits([...input].reverse(), 50).sort((a,b) => a.id.localeCompare(b.id))).toEqual([...slow].sort((a,b) => a.id.localeCompare(b.id)));
});
