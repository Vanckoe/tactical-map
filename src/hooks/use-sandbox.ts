"use client";
import { useEffect, useState } from "react";
import { initialUnits, kinds, Kind, Unit, tickUnits } from "@/lib/simulation";
export const regions: Record<string, [number, number]> = {
  "Алматинская область": [43.36, 77.07],
  Астана: [51.16, 71.43],
  Шымкент: [42.32, 69.59],
  Бишкек: [42.87, 74.6],
  Ташкент: [41.3, 69.24],
};
export function useSandbox() {
  const [focus, setFocus] = useState<[number, number]>(
    regions["Алматинская область"],
  );
  const [units, setUnits] = useState<Unit[]>(initialUnits);
  const [selected, setSelected] = useState("");
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [seconds, setSeconds] = useState(0);
  const [side, setSide] = useState<"blue" | "red">("blue");
  const [kind, setKind] = useState<Kind>("infantry");
  const [echelon, setEchelon] = useState("Батальон");
  const [placing, setPlacing] = useState(false);
  const [command, setCommand] = useState(false);
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
  const unit = units.find((u) => u.id === selected);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setSeconds((s) => s + speed);
      setUnits((u) => tickUnits(u, speed));
    }, 1000);
    return () => clearInterval(timer);
  }, [running, speed]);
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
  }, []);
  function log(message: string) {
    setLogs((l) => [message, ...l].slice(0, 30));
  }
  function onMapClick(lat: number, lng: number) {
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
      setPlacing(false);
      log(`Размещено соединение: ${name}`);
      setToast("Соединение размещено");
    } else if (command && unit && unit.hp > 0) {
      setUnits((u) =>
        u.map((v) =>
          v.id === selected
            ? { ...v, target: [lat, lng], order: "Движение" }
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
        JSON.stringify({ units, seconds, region, mode }),
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
            typeof u.lat === "number" &&
            typeof u.lng === "number" &&
            kinds.some((k) => k.id === u.kind),
        ) ||
        !regions[data.region]
      )
        throw Error();
      setPlacing(false);
      setCommand(false);
      setUnits(data.units);
      setSeconds(data.seconds || 0);
      setRegion(data.region);
      setFocus([...regions[data.region]]);
      setMode(data.mode || "sandbox");
      setSelected(data.units[0]?.id || "");
      setRunning(false);
      log("Загружен сохранённый сценарий");
      setToast("Сценарий загружен");
    } catch {
      setToast("Не удалось прочитать сохранение");
    }
  }
  function reset() {
    setUnits(initialUnits.map((u) => ({ ...u })));
    setSelected("");
    setPlacing(false);
    setCommand(false);
    setSeconds(0);
    setRunning(false);
    setRegion("Алматинская область");
    setFocus([...regions["Алматинская область"]]);
    setModal("");
    log("Сценарий сброшен");
  }
  const time = `${String(6 + Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  return {
    focus,
    setFocus,
    units,
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
    setCommand,
    grid,
    setGrid,
    routes,
    setRoutes,
    enemies,
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
    save,
    load,
    reset,
    time,
  };
}
export type Sandbox = ReturnType<typeof useSandbox>;
