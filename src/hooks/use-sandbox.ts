"use client";
import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { isWorkspaceShortcut } from "@/lib/keyboard";
import { insideTerritory, observedUnits } from "@/lib/border-patrol";
import { initialUnits, kinds, Kind, Unit } from "@/lib/simulation";
import { newBattle, startScenario, tickBattle, resumeBotControl } from "@/lib/battle";
import { getScenario } from "@/lib/scenarios";
import { terrainAt, planRoute, type Waypoint } from "@/lib/terrain";
import { distanceKm, segmentInPolygon } from "@/lib/geo";
import { UNIT_PROFILES, type Echelon, isEchelon } from "@/lib/unit-balance";
import { beginTransportOperation, cancelTransportOperation, releaseTransport, transportLocked, validTransportState, type TransportOperation } from "@/lib/transport";
export const regions: Record<string, [number, number]> = {
  "Алматинская область": [43.36, 77.07],
  Есик: [43.355, 77.462],
  Каскелен: [43.202, 76.623],
  Талгар: [43.303, 77.239],
  Астана: [51.16, 71.43],
  Шымкент: [42.32, 69.59],
  Бишкек: [42.87, 74.6],
  Ташкент: [41.3, 69.24],
  Петропавл: [54.8734, 69.1507],
  Булаево: [54.896056, 70.448157],
};
export function useSandbox() {
  const [focus, setFocus] = useState<[number, number]>(
    regions["Алматинская область"],
  );
  const [battle, setBattle] = useState(() => newBattle(initialUnits));
  const { units, seconds } = battle;
  const setUnits: Dispatch<SetStateAction<Unit[]>> = (value) => setBattle((old) => ({ ...old, units: typeof value === "function" ? value(old.units) : value }));
  const [botEnabled, setBotEnabled] = useState(false);
  const scenario = getScenario(battle.scenarioId);
  const [selected, setSelected] = useState("");
  const [isRunning, setRunning] = useState(false);
  const running = isRunning && !battle.winner;
  const [speed, setSpeed] = useState(1);
  const [side, setSide] = useState<"blue" | "red">("blue");
  const [kind, setKind] = useState<Kind>("infantry");
  const [echelon, setEchelon] = useState<Echelon>("Батальон");
  const [placing, setPlacing] = useState(false);
  const [command, updateCommand] = useState(false);
  const [patrolDraft, setPatrolDraft] = useState<{ start?: Waypoint } | null>(null);
  const setCommand = useCallback((active: boolean) => {
    updateCommand(active);
    if (!active) setPatrolDraft(null);
  }, [setPatrolDraft]);
  const [attackCommand, setAttackCommand] = useState(false);
  const [grid, setGrid] = useState(false);
  const [routes, setRoutes] = useState(true);
  const [enemies, setEnemies] = useState(true);
  const [region, setRegion] = useState("Алматинская область");
  const [zoom, setZoom] = useState(0);
  const [modal, setModal] = useState("");
  const [toast, setToast] = useState("");
  const [logs, setLogs] = useState([
    "Сценарий «Жетысу» готов к запуску",
    "Соединения развёрнуты на исходных позициях",
  ]);
  const [mode, setMode] = useState("sandbox");
  const visibleUnits = observedUnits(battle, scenario, botEnabled);
  const unit = visibleUnits.find((u) => u.id === selected);
  function changeBotControl(enabled: boolean) {
    if (!scenario || battle.winner || enabled === botEnabled) return;
    if (enabled) {
      setBattle(resumeBotControl);
      if (units.some((u) => u.id === selected && u.side === "red")) {
        setSelected("");
        setCommand(false);
      }
      if (side === "red") setPlacing(false);
    }
    setBotEnabled(enabled);
  }
  const removeSelectedUnit = useCallback(() => {
    if (!unit || scenario?.borderPatrol || battle.winner || (botEnabled && unit.side === "red")) return;
    setBattle((old) => ({ ...old, units: releaseTransport(old.units, unit.id, { terrain: scenario?.terrain }).filter((u) => u.id !== unit.id) }));
    setSelected("");
    setCommand(false);
    setLogs((logs) => [`Удалено: ${unit.name}`, ...logs].slice(0, 30));
  }, [unit, battle.winner, botEnabled, scenario, setSelected, setCommand, setLogs]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!isWorkspaceShortcut(event) || event.repeat) return;
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        removeSelectedUnit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [removeSelectedUnit]);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setBattle((old) => tickBattle(old, speed, botEnabled));
    }, 1000);
    return () => clearInterval(timer);
  }, [running, speed, botEnabled]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPlacing(false);
        setCommand(false);
        setModal("");
      }
      if (
        (e.target as HTMLElement).closest(
          "input,select,textarea,button,[role=dialog],[role=menu],[role=combobox]",
        )
      )
        return;
      if (e.code === "Space") {
        e.preventDefault();
        setRunning((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setCommand]);
  function log(message: string) {
    setLogs((l) => [message, ...l].slice(0, 30));
  }
  function onMapClick(lat: number, lng: number, shiftKey = false) {
    if (command && unit && transportLocked(unit, units)) return;
    if (command && unit && scenario?.borderPatrol?.starts) {
      const origin = patrolDraft?.start ? { lat: patrolDraft.start[0], lng: patrolDraft.start[1] } : unit;
      if (!segmentInPolygon(origin, { lat, lng }, scenario.borderPatrol.territory.polygon)) { setToast("Маршрут выходит за игровую границу."); return; }
    }
    if (scenario?.borderPatrol && command && unit?.contactLost) return;
    if (scenario?.borderPatrol && battle.borderEntered && command && unit?.side === "red" && !insideTerritory({ lat, lng }, scenario)) { setToast("После входа выход за игровую границу запрещён."); return; }
    if (placing && scenario) { setToast("Состав сил задан сценарием. Для размещения выберите свободную песочницу."); return; }
    if (battle.winner) { setToast("Сценарий завершён. Начните заново через меню сценария."); return; }
    if (botEnabled && ((placing && side === "red") || (command && unit?.side === "red"))) { setToast("Противником управляет бот. Отключите бота для ручного управления."); return; }
    if ((placing || command) && !UNIT_PROFILES[placing ? kind : unit?.kind ?? kind].airborne && terrainAt({ lat, lng }, scenario?.terrain ?? []) === "water") { setToast("Водная преграда: выберите доступный участок суши."); return; }
    if (placing) {
      const id = String(Math.max(0, ...units.map((u) => Number(u.id))) + 1);
      const name = `${kinds.find((k) => k.id === kind)?.label} · ${id}`;
      setUnits((u) => [
        ...u,
        {
          id,
          name,
          kind,
          echelon,
          side,
          lat,
          lng,
          hp: 100,
          supply: 100,
          order: "Удержание",
        },
      ]);
      setSelected(id);
      setPlacing(shiftKey);
      log(`Размещено соединение: ${name}`);
      setToast("Соединение размещено");
    } else if (command && unit && unit.hp > 0) {
      if (patrolDraft) {
        if (!patrolDraft.start) {
          if (!planRoute(unit, { lat, lng }, scenario?.terrain ?? [], UNIT_PROFILES[unit.kind].airborne).length) {
            setToast("Маршрут недоступен"); return;
          }
          setPatrolDraft({ start: [lat, lng] });
          return;
        }
        const start = patrolDraft.start;
        if (distanceKm({ lat: start[0], lng: start[1] }, { lat, lng }) < 0.05) {
          setToast("Точки патруля должны быть не ближе 50 м друг к другу."); return;
        }
        const terrain = scenario?.terrain ?? [];
        const airborne = UNIT_PROFILES[unit.kind].airborne;
        if (!planRoute(unit, { lat: start[0], lng: start[1] }, terrain, airborne).length || !planRoute({ lat: start[0], lng: start[1] }, { lat, lng }, terrain, airborne).length) {
          setToast("Маршрут недоступен"); return;
        }
        setUnits((units) => units.map((u) => u.id === selected ? {
          ...u, patrol: { points: [start, [lat, lng]], next: 0, started: false },
          target: start, route: undefined, advance: false, stationarySeconds: 0, entrenchment: 0, order: "Выход на маршрут патруля",
        } : u));
        setCommand(false);
        log(`${unit.name}: патрулирование А ↔ Б`);
        setToast("Патруль задан. Соединение направится к точке А.");
        return;
      }
      setUnits((u) =>
        u.map((v) =>
          v.id === selected
            ? { ...v, target: [lat, lng], route: undefined, patrol: undefined, advance: attackCommand, stationarySeconds: 0, entrenchment: 0, order: attackCommand ? "Сближение" : "Движение" }
            : v,
        ),
      );
      setCommand(false);
      log(`${unit.name}: приказ на движение`);
      setToast("Маршрут задан. Запустите симуляцию.");
    }
  }
  function save() {
    try {
      localStorage.setItem(
        "dala-scenario",
        JSON.stringify({ units, seconds, region, mode, battle, botEnabled }),
      );
      setToast("Сценарий сохранён в этом браузере");
    } catch {
      setToast("Не удалось сохранить: хранилище недоступно");
    }
  }
  function load() {
    try {
      const raw = localStorage.getItem("dala-scenario");
      if (!raw) {
        setToast("Сохранённых сценариев пока нет");
        return;
      }
      const data = JSON.parse(raw);
      if (
        !Array.isArray(data.units) ||
        !data.units.every(
          (u: Unit) =>
            u &&
            typeof u.id === "string" &&
            typeof u.name === "string" &&
            Number.isFinite(u.lat) &&
            Math.abs(u.lat) <= 90 &&
            Number.isFinite(u.lng) &&
            Math.abs(u.lng) <= 180 &&
            isEchelon(u.echelon) &&
            (u.side === "blue" || u.side === "red") &&
            Number.isFinite(u.hp) &&
            u.hp >= 0 &&
            u.hp <= 100 &&
            Number.isFinite(u.supply) &&
            u.supply >= 0 &&
            u.supply <= 100 &&
            (u.route === undefined || (Array.isArray(u.route) && u.route.length <= 100 && u.route.every((p) => Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Math.abs(p[0]) <= 90 && Number.isFinite(p[1]) && Math.abs(p[1]) <= 180))) &&
            (u.patrol === undefined || (u.patrol && Array.isArray(u.patrol.points) && u.patrol.points.length === 2 && u.patrol.points.every((p) => Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Math.abs(p[0]) <= 90 && Number.isFinite(p[1]) && Math.abs(p[1]) <= 180) && (u.patrol.next === 0 || u.patrol.next === 1) && typeof u.patrol.started === "boolean" && !!u.target && u.target[0] === u.patrol.points[u.patrol.next][0] && u.target[1] === u.patrol.points[u.patrol.next][1])) &&
            (u.advance === undefined || typeof u.advance === "boolean") &&
            [u.stationarySeconds, u.entrenchment, u.suppression, u.recoverableHp].every((value) => value === undefined || (Number.isFinite(value) && value >= 0)) &&
            (u.entrenchment === undefined || u.entrenchment <= 1) &&
            (u.suppression === undefined || u.suppression <= 100) &&
            (u.stationarySeconds === undefined || u.stationarySeconds <= 3600) &&
            (u.recoverableHp === undefined || u.recoverableHp <= 100 - u.hp + 0.000001) &&
            (!u.target ||
              (Array.isArray(u.target) &&
                u.target.length === 2 &&
                Number.isFinite(u.target[0]) &&
                Math.abs(u.target[0]) <= 90 &&
                Number.isFinite(u.target[1]) &&
                Math.abs(u.target[1]) <= 180)) &&
            kinds.some((k) => k.id === u.kind),
        ) ||
        !validTransportState(data.units) ||
        !regions[data.region]
      )
        throw Error();
      setPlacing(false);
      setCommand(false);
      const saved = data.battle;
      const loadedScenario = getScenario(saved?.scenarioId);
      const contact = saved?.lastKnownIntruder;
      if (contact !== undefined && (!contact || !Number.isFinite(contact.lat) || Math.abs(contact.lat) > 90 || !Number.isFinite(contact.lng) || Math.abs(contact.lng) > 180 || !Number.isInteger(contact.seconds) || contact.seconds < 0 || contact.seconds > data.seconds)) throw Error();
      if (loadedScenario?.borderPatrol && (
        typeof saved.borderEntered !== "boolean" ||
        ![undefined, "captured", "escaped", "timeout"].includes(saved.borderOutcome) ||
        data.units.filter((u: Unit) => u.id === loadedScenario.borderPatrol!.intruderId && u.side === "red").length !== 1 ||
        (saved.borderEntered && !insideTerritory(data.units.find((u: Unit) => u.id === loadedScenario.borderPatrol!.intruderId), loadedScenario))
      )) throw Error();
      if (saved && (!Number.isInteger(saved.cityHeldSeconds) || saved.cityHeldSeconds < 0 || !Array.isArray(saved.releasedReserves) || new Set(saved.releasedReserves).size !== saved.releasedReserves.length || !saved.releasedReserves.every((id: unknown) => getScenario(saved.scenarioId)?.reserves.some((wave) => wave.id === id && wave.releaseSeconds <= data.seconds)) || !saved.points || typeof saved.points !== "object" || !Object.values(saved.points).every((point) => {
        const p = point as { owner: string | null; progress: number; contested: boolean };
        return p && [null, "blue", "red"].includes(p.owner) && Number.isFinite(p.progress) && Math.abs(p.progress) <= 15 && typeof p.contested === "boolean";
      }) || ![undefined, "blue", "red", "draw"].includes(saved.winner) || !(saved.scenarioId === "sandbox" || getScenario(saved.scenarioId)))) throw Error();
      if (!Number.isInteger(data.seconds) || data.seconds < 0) throw Error();
      setBattle({ ...newBattle(data.units, saved?.scenarioId ?? "sandbox"), seconds: data.seconds, ...(saved ? { cityHeldSeconds: saved.cityHeldSeconds, releasedReserves: saved.releasedReserves, points: saved.points, winner: saved.winner, borderEntered: saved.borderEntered, borderOutcome: saved.borderOutcome, lastKnownIntruder: saved.lastKnownIntruder } : {}) });
      setBotEnabled(data.botEnabled === true && !!getScenario(saved?.scenarioId));
      setRegion(data.region);
      setFocus(getScenario(saved?.scenarioId)?.center ?? [...regions[data.region]]);
      setMode(data.mode || "sandbox");
      setSelected(data.units[0]?.id || "");
      setRunning(false);
      log("Загружен сохранённый сценарий");
      setToast("Сценарий загружен");
    } catch {
      setToast("Не удалось прочитать сохранение");
    }
  }
  function selectScenario(id: string) {
    const chosen = getScenario(id);
    setBattle(chosen ? startScenario(chosen) : newBattle(initialUnits));
    setBotEnabled(!!chosen);
    setMode(chosen ? "game" : "sandbox");
    setRegion(chosen?.region ?? "Алматинская область");
    setFocus(chosen?.center ?? [...regions["Алматинская область"]]);
    setSelected(""); setPlacing(false); setCommand(false); setRunning(false); setSide("blue"); setModal("");
    setLogs([chosen?.borderPatrol ? chosen.description : chosen ? `${chosen.name}: ${chosen.attackerSide === "blue" ? "Займите город и удерживайте его 15 минут" : "Удержите город до истечения времени"}. Резервы вводятся по расписанию. Противником управляет бот.` : "Песочница готова"]);
  }
  function transfer(type: TransportOperation["type"], ids: string[]) {
    if (!unit || battle.winner || (botEnabled && unit.side === "red")) return;
    const area = { terrain: scenario?.terrain, polygon: scenario?.borderPatrol?.territory.polygon };
    const next = beginTransportOperation(units, unit.id, type, ids, area);
    if (next === units) { setToast("Операция недоступна: проверьте остановку, расстояние и свободные места."); return; }
    setUnits((current) => beginTransportOperation(current, unit.id, type, ids, area));
    setCommand(false);
    setToast(type === "board" ? "Посадка начата: 5 игровых минут." : "Высадка начата: 5 игровых минут.");
  }
  function cancelTransfer() {
    if (!unit || battle.winner || (botEnabled && unit.side === "red")) return;
    setUnits((current) => cancelTransportOperation(current, unit.id));
  }
  function reset() { selectScenario(battle.scenarioId); }
  const time = `${String(6 + Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  return {
    battle, scenario, botEnabled, setBotEnabled: changeBotControl, selectScenario,
    focus,
    setFocus,
    units,
    visibleUnits,
    setUnits,
    selected,
    setSelected,
    running,
    setRunning,
    speed,
    setSpeed,
    seconds,
    side,
    setSide,
    kind,
    setKind,
    echelon,
    setEchelon,
    placing,
    setPlacing,
    command,
    patrolDraft,
    setPatrolDraft,
    setCommand,
    setAttackCommand,
    grid,
    setGrid,
    routes,
    setRoutes,
    enemies: !!scenario && !botEnabled ? true : enemies,
    setEnemies,
    region,
    setRegion,
    zoom,
    setZoom,
    modal,
    setModal,
    toast,
    setToast,
    logs,
    mode,
    setMode,
    unit,
    log,
    onMapClick,
    removeSelectedUnit,
    transfer,
    cancelTransfer,
    save,
    load,
    reset,
    time,
  };
}
export type Sandbox = ReturnType<typeof useSandbox>;
