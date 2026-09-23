import { test, expect } from "bun:test";
import { planRoute, segmentCost, terrainSpeed } from "../src/lib/terrain.ts";
import { commandEnemy, newBattle, tickBattle } from "../src/lib/battle.ts";
import { SCENARIOS } from "../src/lib/scenarios.ts";
import { tickUnits } from "../src/lib/simulation.ts";
import { distanceKm } from "../src/lib/geo.ts";
const unit = (id, side, point, extra = {}) => ({ id, name: id, side, kind: "infantry", echelon: "Рота", hp: 100, supply: 100, order: "Удержание", ...point, ...extra });

test("routes avoid water and cannot end inside it", () => {
  const zones = [{ id: "lake", label: "lake", type: "water", lat: 0, lng: 0, radiusKm: 1 }];
  const from = { lat: 0, lng: -0.03 }, to = { lat: 0, lng: 0.03 };
  const route = planRoute(from, to, zones);
  expect(route.length).toBeGreaterThan(1);
  let previous = from;
  for (const [lat,lng] of route) { const next = {lat,lng}; expect(Number.isFinite(segmentCost(previous,next,zones))).toBe(true); previous = next; }
  expect(planRoute(from, {lat:0,lng:0}, zones)).toEqual([]);
  expect(planRoute(from,to,zones,true)).toEqual([[0,0.03]]);
});
test("ground movement follows the computed detour, air ignores the obstacle", () => {
  const zones = [{ id: "lake", label: "lake", type: "water", lat: 0, lng: 0, radiusKm: 1 }];
  let ground = unit("g","blue",{lat:0,lng:-0.03},{target:[0,0.03]});
  for(let i=0;i<1200;i++) { ground=tickUnits([ground],1,zones)[0]; expect(distanceKm(ground,zones[0])).toBeGreaterThan(1); }
  expect(ground.target).toBeUndefined();
});
test("rough terrain slows movement", () => {
  const zones=[{id:"hill",label:"hill",type:"rough",lat:0,lng:0,radiusKm:2}];
  const u=unit("1","blue",{lat:0,lng:0},{target:[0,0.01]});
  expect(tickUnits([u],1,zones)[0].lng).toBeLessThan(tickUnits([u],1)[0].lng);
  expect(terrainSpeed(u,zones)).toBe(0.45);
});
test("bot issues orders only to the red side and uses no hidden enemies", () => {
  const scenario=SCENARIOS[1];
  const commanded=commandEnemy(scenario.units,scenario,{});
  expect(commanded.filter((u)=>u.side==="blue")).toEqual(scenario.units.filter((u)=>u.side==="blue"));
  expect(commanded.some((u)=>u.side==="red"&&u.target)).toBe(true);
  const red=scenario.units.filter((u)=>u.side==="red");
  const hidden=unit("hidden","blue",{lat:10,lng:10});
  expect(commandEnemy([...red,hidden],scenario,{}).filter((u)=>u.side==="red")).toEqual(commandEnemy(red,scenario,{}));
});
test("asymmetric forces start far apart with a small prepared garrison", () => {
  for (const scenario of SCENARIOS.filter((s) => !s.borderPatrol)) {
    const attackers = scenario.units.filter((u) => u.side === scenario.attackerSide);
    const defenders = scenario.units.filter((u) => u.side !== scenario.attackerSide);
    expect(attackers.length).toBeGreaterThan(defenders.length);
    expect(defenders.length).toBe(4);
    expect(Math.min(...attackers.map((u) => distanceKm(u, scenario.objectives[0])))).toBeGreaterThan(25);
    expect(defenders.every((u) => distanceKm(u, scenario.objectives[0]) < 2)).toBe(true);
    expect(new Set([...scenario.units, ...scenario.reserves.flatMap((w) => w.units)].map((u) => u.id)).size).toBe(scenario.units.length + scenario.reserves.flatMap((w) => w.units).length);
  }
});
test("reserves appear exactly once at their rear positions, including across save and reload", () => {
  const scenario = SCENARIOS[0], wave = scenario.reserves[0];
  const state = {...newBattle(scenario.units, scenario.id), seconds: wave.releaseSeconds - 2};
  const before = tickBattle(state, 1, false);
  expect(before.units.length).toBe(scenario.units.length);
  const arrived = tickBattle(before, 1, false);
  expect(arrived.releasedReserves).toEqual([wave.id]);
  expect(arrived.units.length).toBe(scenario.units.length + wave.units.length);
  for (const u of wave.units) expect(distanceKm(arrived.units.find((v) => v.id === u.id), u)).toBe(0);
  const reloaded = tickBattle(JSON.parse(JSON.stringify(arrived)), 50, false);
  expect(reloaded.units.length).toBe(arrived.units.length);
});
test("losing the garrison does not defeat defenders while the city has not been secured", () => {
  const scenario = SCENARIOS[0];
  const state = newBattle(scenario.units.filter((u) => u.side === scenario.attackerSide), scenario.id);
  expect(tickBattle(state, 50, true).winner).toBeUndefined();
});
test("capture needs continuous occupation; leaving and contesting reset the hold timer", () => {
  const scenario = SCENARIOS[0], point = scenario.objectives[0];
  const state = newBattle([unit("b", "blue", point)], scenario.id);
  const held = tickBattle(state, 100, false);
  expect(held.points[point.id].owner).toBe("blue");
  expect(held.cityHeldSeconds).toBe(71);
  expect(held.winner).toBeUndefined();
  const empty = {...held, units: [unit("b", "blue", scenario.blueBase)]};
  expect(tickBattle(empty, 1, false).cityHeldSeconds).toBe(0);
  const contested = {...held, units: [unit("b", "blue", point), unit("r", "red", point)]};
  expect(tickBattle(contested, 1, false).cityHeldSeconds).toBe(0);
  const won = tickBattle(state, 950, false);
  expect(won.winner).toBe("blue");
  expect(won.seconds).toBe(929);
  expect(tickBattle(won, 50, true)).toBe(won);
});
test("defenders win at the deadline, never from passive control before it", () => {
  for (const scenario of SCENARIOS.filter((s) => !s.borderPatrol)) {
    const state = {...newBattle(scenario.units, scenario.id), seconds: scenario.timeLimitSeconds - 2};
    expect(tickBattle(state, 1, false).winner).toBeUndefined();
    expect(tickBattle(state, 2, false).winner).toBe(scenario.attackerSide === "blue" ? "red" : "blue");
  }
});
test("defending AI preserves garrison positions while attacking AI advances", () => {
  for (const scenario of SCENARIOS.filter((s) => !s.borderPatrol)) {
    const state = newBattle(scenario.units, scenario.id);
    const commanded = commandEnemy(state.units, scenario, state.points);
    const red = commanded.filter((u) => u.side === "red");
    expect(red.some((u) => u.target)).toBe(scenario.attackerSide === "red");
  }
});
test("scenario AI and reserve release are independent of playback speed", () => {
  const scenario = SCENARIOS[1];
  const state = {...newBattle(scenario.units, scenario.id), seconds: scenario.reserves[0].releaseSeconds - 25};
  let slow = state;
  for(let i=0;i<50;i++)slow=tickBattle(slow,1,true);
  expect(tickBattle(state,50,true)).toEqual(slow);
});

test("an attacking bot completes the march and defeats an idle defender", () => {
  for (const scenario of SCENARIOS.filter((s) => !s.borderPatrol && s.attackerSide === "red")) {
    const result = tickBattle(newBattle(scenario.units, scenario.id), scenario.timeLimitSeconds, true);
    expect(result.winner).toBe("red");
    expect(result.cityHeldSeconds).toBe(scenario.holdSeconds);
    expect(result.seconds).toBeGreaterThan(1800);
    expect(result.releasedReserves.length).toBeGreaterThan(0);
  }
});
