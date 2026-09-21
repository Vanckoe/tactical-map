"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Crosshair,
  Layers,
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  Play,
  Pause,
  RotateCcw,
  Save,
  FolderOpen,
  Settings2,
  Search,
  MapPin,
  MousePointer2,
  MoveUpRight,
  Shield,
  X,
  Check,
  Flag,
  Clock3,
  Radio,
  Maximize,
  Target,
  BookOpen,
  Trash2,
  Navigation,
  Mountain,
  Sun,
  Wind,
  PanelLeftClose,
  Hexagon,
} from "lucide-react";
import { initialUnits, kinds, Kind, Unit, tickUnits } from "@/lib/simulation";
import UnitSymbol from "@/components/unit-symbol";
const TacticalMap = dynamic(() => import("@/components/tactical-map"), {
  ssr: false,
  loading: () => (
    <div className="map-loading">Загрузка картографической основы…</div>
  ),
});
const regions: Record<string, [number, number]> = {
  "Алматинская область": [43.36, 77.07],
  Астана: [51.16, 71.43],
  Шымкент: [42.32, 69.59],
  Бишкек: [42.87, 74.6],
  Ташкент: [41.3, 69.24],
};
export default function Home() {
  const [units, setUnits] = useState<Unit[]>(initialUnits);
  const [selected, setSelected] = useState("1");
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [seconds, setSeconds] = useState(0);
  const [tab, setTab] = useState("Соединения");
  const [filter, setFilter] = useState("");
  const [side, setSide] = useState<"blue" | "red">("blue");
  const [kind, setKind] = useState<Kind>("infantry");
  const [echelon, setEchelon] = useState("Батальон");
  const [placing, setPlacing] = useState(false);
  const [command, setCommand] = useState(false);
  const [grid, setGrid] = useState(true);
  const [routes, setRoutes] = useState(true);
  const [enemies, setEnemies] = useState(true);
  const [layers, setLayers] = useState(false);
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
  const friendly = units.filter((u) => u.side === "blue");
  const opponent = units.filter((u) => u.side === "red");
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
      if ((e.target as HTMLElement).matches("input,select,textarea")) return;
      if (e.code === "Space") {
        e.preventDefault();
        setRunning((v) => !v);
      }
      if (e.key === "Escape") {
        setPlacing(false);
        setCommand(false);
        setModal("");
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
      const name = `${units.length + 1}-й ${kinds.find((k) => k.id === kind)?.label.toLowerCase()}`;
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
      setUnits(data.units);
      setSeconds(data.seconds || 0);
      setRegion(data.region);
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
    setSelected("1");
    setSeconds(0);
    setRunning(false);
    setRegion("Алматинская область");
    setModal("");
    log("Сценарий сброшен");
  }
  const time = `${String(6 + Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  return (
    <main className="app-shell">
      <header className="topbar">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Hexagon />
            <Crosshair />
          </span>
          <span>
            DALA<span className="brand-sub">TACTICAL SANDBOX</span>
          </span>
          <span className="alpha">ALPHA 0.1</span>
        </Link>
        <nav className="mode-nav" aria-label="Режим">
          <button
            className={mode === "sandbox" ? "active" : ""}
            onClick={() => setMode("sandbox")}
          >
            <Layers size={15} />
            Песочница
          </button>
          <button
            className={mode === "game" ? "active" : ""}
            onClick={() => {
              setMode("game");
              setModal("game");
            }}
          >
            <Flag size={15} />
            Сценарии
            <span className="new-dot" />
          </button>
        </nav>
        <div className="header-right">
          <span className="local-indicator" />
          Локальная сессия
          <button
            className="icon-btn"
            aria-label="Справка"
            onClick={() => setModal("help")}
          >
            <BookOpen size={17} />
          </button>
          <button
            className="avatar"
            onClick={() => setModal("settings")}
            aria-label="Настройки"
          >
            K
          </button>
        </div>
      </header>
      <div className="workspace-bar">
        <div>
          <span className="muted">Рабочее пространство</span>
          <ChevronRight size={13} />
          <strong>Сценарий «Жетысу»</strong>
          <span className="draft">Черновик</span>
        </div>
        <div>
          <button onClick={load}>
            <FolderOpen size={15} />
            Открыть
          </button>
          <button onClick={save}>
            <Save size={15} />
            Сохранить
          </button>
          <span className="separator" />
          <button onClick={() => setModal("reset")}>
            <RotateCcw size={15} />
            Сбросить
          </button>
        </div>
      </div>
      <div className="workspace">
        <aside className="left-panel">
          <div className="panel-heading">
            <h1>Управление силами</h1>
            <PanelLeftClose size={16} />
          </div>
          <div className="panel-tabs">
            {["Соединения", "Библиотека"].map((t) => (
              <button
                key={t}
                className={tab === t ? "active" : ""}
                onClick={() => setTab(t)}
              >
                {t}
                {t === "Соединения" && <span>{units.length}</span>}
              </button>
            ))}
          </div>
          <div className="left-body">
            <div className="section-label">СТОРОНА КОНФЛИКТА</div>
            <div className="side-switch">
              <button
                className={side === "blue" ? "active blue" : ""}
                onClick={() => setSide("blue")}
              >
                <span className="side-dot blue" />
                Свои<span>{friendly.length}</span>
              </button>
              <button
                className={side === "red" ? "active red" : ""}
                onClick={() => setSide("red")}
              >
                <span className="side-dot red" />
                Противник<span>{opponent.length}</span>
              </button>
            </div>
            <label className="search">
              <Search size={15} />
              <input
                aria-label="Поиск соединений"
                placeholder="Поиск соединений"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              <kbd>⌕</kbd>
            </label>
            {tab === "Соединения" ? (
              <>
                <div className="tree-heading">
                  <ChevronDown size={14} />
                  <Flag size={14} />
                  <span>
                    {side === "blue"
                      ? "Группировка «Жетысу»"
                      : "Условный противник"}
                  </span>
                  <span className="muted">
                    {units.filter((u) => u.side === side).length}
                  </span>
                </div>
                <div className="unit-list">
                  {units
                    .filter(
                      (u) =>
                        u.side === side &&
                        u.name.toLowerCase().includes(filter.toLowerCase()),
                    )
                    .map((u) => (
                      <button
                        className={`unit-row ${selected === u.id ? "active" : ""}`}
                        key={u.id}
                        onClick={() => setSelected(u.id)}
                      >
                        <UnitSymbol kind={u.kind} side={u.side} />
                        <span>
                          <strong>{u.name}</strong>
                          <small>
                            {u.echelon}
                            <i /> {u.order}
                          </small>
                        </span>
                        <span
                          className={`ready-dot ${u.hp === 0 ? "lost" : ""}`}
                        />
                      </button>
                    ))}
                  {!units.some(
                    (u) =>
                      u.side === side &&
                      u.name.toLowerCase().includes(filter.toLowerCase()),
                  ) && <p className="empty-state">Соединений не найдено</p>}
                </div>
              </>
            ) : (
              <div className="library-list">
                {kinds.map((k) => (
                  <button
                    key={k.id}
                    onClick={() => {
                      setKind(k.id);
                      setPlacing(true);
                    }}
                  >
                    <UnitSymbol kind={k.id} side={side} />
                    <span>
                      {k.label}
                      <small>Разместить на карте</small>
                    </span>
                    <Plus size={15} />
                  </button>
                ))}
              </div>
            )}
            <div className="add-section">
              <div className="section-label">НОВОЕ СОЕДИНЕНИЕ</div>
              <div className="type-grid">
                {kinds.map((k) => (
                  <button
                    key={k.id}
                    className={kind === k.id ? "active" : ""}
                    onClick={() => setKind(k.id)}
                  >
                    <UnitSymbol kind={k.id} side={side} />
                    <span>{k.label}</span>
                  </button>
                ))}
              </div>
              <label className="field-label">
                Масштаб соединения
                <select
                  value={echelon}
                  onChange={(e) => setEchelon(e.target.value)}
                >
                  {[
                    "Отделение",
                    "Взвод",
                    "Рота",
                    "Батальон",
                    "Полк",
                    "Бригада",
                    "Дивизия",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <button
                className={`primary add-button ${placing ? "placing" : ""}`}
                onClick={() => {
                  setPlacing(!placing);
                  setCommand(false);
                }}
              >
                {placing ? <X size={16} /> : <Plus size={16} />}{" "}
                {placing ? "Отменить размещение" : "Разместить на карте"}
              </button>
              <p className="subtle-hint">
                Выберите тип и укажите точку на карте
              </p>
            </div>
          </div>
          <div className="sidebar-footer">
            <span className="status-light" /> Все изменения локальны
            <Shield size={14} />
          </div>
        </aside>
        <section
          className={`map-section ${placing || command ? "crosshair-mode" : ""}`}
        >
          <TacticalMap
            units={units}
            selected={selected}
            onSelect={setSelected}
            onMapClick={onMapClick}
            grid={grid}
            routes={routes}
            focus={regions[region]}
            zoomAction={zoom}
            enemies={enemies}
          />
          <div className="map-top">
            <label className="region-picker">
              <MapPin size={17} />
              <span>
                <small>РАЙОН ОПЕРАЦИИ</small>
                <select
                  aria-label="Район операции"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                >
                  {Object.keys(regions).map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </span>
            </label>
            <span className="sandbox-badge">
              <span />
              {mode === "sandbox" ? "ПЕСОЧНИЦА" : "УЧЕБНЫЙ СЦЕНАРИЙ"}
            </span>
          </div>
          <div className="map-tools">
            <button
              aria-label="Выбор"
              className={!command && !placing ? "active" : ""}
              onClick={() => {
                setPlacing(false);
                setCommand(false);
              }}
            >
              <MousePointer2 size={19} />
            </button>
            <button
              aria-label="Приказ на движение"
              className={command ? "active" : ""}
              onClick={() => {
                setCommand(true);
                setPlacing(false);
              }}
            >
              <MoveUpRight size={20} />
            </button>
            <span />
            <button
              aria-label="Слои карты"
              className={layers ? "active" : ""}
              onClick={() => setLayers(!layers)}
            >
              <Layers size={19} />
            </button>
            <button
              aria-label="Координатная сетка"
              className={grid ? "active" : ""}
              onClick={() => setGrid(!grid)}
            >
              <Crosshair size={19} />
            </button>
          </div>
          {layers && (
            <div className="layer-popover">
              <strong>Слои карты</strong>
              {[
                ["Координатная сетка", grid, setGrid],
                ["Маршруты приказов", routes, setRoutes],
                ["Условный противник", enemies, setEnemies],
              ].map(([title, value, set]) => (
                <label key={String(title)}>
                  <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={() => (set as (v: boolean) => void)(!value)}
                  />
                  {String(title)}
                </label>
              ))}
            </div>
          )}
          <div className="map-compass">
            <Navigation size={24} />
            <span>С</span>
          </div>
          <div className="zoom-tools">
            <button
              aria-label="Приблизить"
              onClick={() => setZoom((z) => z + 1)}
            >
              <Plus size={20} />
            </button>
            <button aria-label="Отдалить" onClick={() => setZoom((z) => z - 1)}>
              <Minus size={20} />
            </button>
            <button
              aria-label="Полный экран"
              onClick={() => {
                if (document.fullscreenElement) document.exitFullscreen();
                else
                  document.documentElement
                    .requestFullscreen()
                    .catch(() => setToast("Полноэкранный режим недоступен"));
              }}
            >
              <Maximize size={17} />
            </button>
          </div>
          {(placing || command) && (
            <div className="map-instruction">
              <Crosshair size={16} />
              {placing
                ? "Укажите место размещения соединения"
                : "Укажите точку назначения"}
              <button
                onClick={() => {
                  setPlacing(false);
                  setCommand(false);
                }}
              >
                Esc <X size={13} />
              </button>
            </div>
          )}
          <div className="map-legend">
            <span>
              <i className="legend-blue" />
              Свои войска
            </span>
            <span>
              <i className="legend-red" />
              Противник
            </span>
            <span>
              <i className="legend-route" />
              Маршрут
            </span>
          </div>
          <div className="map-location">
            <span>
              {regions[region][0].toFixed(2)}° N &nbsp;{" "}
              {regions[region][1].toFixed(2)}° E
            </span>
            <span>WGS 84</span>
          </div>
          <div className="simulation-bar">
            <div className="sim-time">
              <Clock3 size={18} />
              <div>
                <small>ВРЕМЯ СИМУЛЯЦИИ</small>
                <strong>{time}</strong>
              </div>
              <span className={running ? "running-tag" : "pause-tag"}>
                {running ? "В процессе" : "Пауза"}
              </span>
            </div>
            <div className="play-controls">
              <button
                className="icon-btn"
                aria-label="Сбросить симуляцию"
                onClick={() => setModal("reset")}
              >
                <RotateCcw size={17} />
              </button>
              <button
                className="play-button"
                aria-label={running ? "Приостановить" : "Запустить"}
                onClick={() => setRunning(!running)}
              >
                {running ? (
                  <Pause size={19} />
                ) : (
                  <Play size={19} fill="currentColor" />
                )}
              </button>
              <div className="speed-controls">
                {[1, 2, 5].map((s) => (
                  <button
                    key={s}
                    className={speed === s ? "active" : ""}
                    onClick={() => setSpeed(s)}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            </div>
            <div className="sim-hint">
              <kbd>Space</kbd> {running ? "пауза" : "запуск"}
            </div>
          </div>
        </section>
        <aside className="right-panel">
          <div className="panel-heading">
            <h2>Инспектор соединения</h2>
            <Settings2 size={16} />
          </div>
          {unit ? (
            <>
              <div className="inspector-unit">
                <UnitSymbol kind={unit.kind} side={unit.side} />
                <span className="unit-side-label">
                  {unit.side === "blue" ? "СВОИ ВОЙСКА" : "ПРОТИВНИК"} ·{" "}
                  {unit.echelon.toUpperCase()}
                </span>
                <h2>{unit.name}</h2>
                <p>
                  {kinds.find((k) => k.id === unit.kind)?.label}{" "}
                  <span> / </span> Группировка «Жетысу»
                </p>
                <div className="unit-state">
                  <span className="ready-dot" />
                  {unit.order}
                  <span>
                    № {unit.id.length > 5 ? "10+" : unit.id.padStart(3, "0")}
                  </span>
                </div>
              </div>
              <div className="inspector-section">
                <div className="section-label">СОСТОЯНИЕ</div>
                {[
                  ["Боеспособность", unit.hp, "green"],
                  ["Снабжение", unit.supply, "blue"],
                ].map(([label, value, color]) => (
                  <div className="stat" key={label}>
                    <div>
                      <span>{label}</span>
                      <strong>
                        {Math.round(Number(value))}
                        <small>%</small>
                      </strong>
                    </div>
                    <div className="stat-track">
                      <i
                        className={String(color)}
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                ))}
                <div className="mini-stats">
                  <div>
                    <small>Мораль</small>
                    <strong>{unit.hp > 60 ? "Высокая" : "Низкая"}</strong>
                  </div>
                  <div>
                    <small>Подвижность</small>
                    <strong>{unit.supply > 0 ? "Готов" : "Нет топлива"}</strong>
                  </div>
                </div>
              </div>
              <div className="inspector-section">
                <div className="section-label">ПРИКАЗЫ</div>
                <div className="orders">
                  <button
                    className={command ? "active" : ""}
                    onClick={() => {
                      setCommand(!command);
                      setPlacing(false);
                    }}
                  >
                    <MoveUpRight size={19} />
                    <span>Движение</span>
                  </button>
                  <button
                    onClick={() => {
                      setUnits((us) =>
                        us.map((u) =>
                          u.id === selected
                            ? { ...u, target: undefined, order: "Удержание" }
                            : u,
                        ),
                      );
                      setCommand(false);
                      log(`${unit.name}: удерживать позицию`);
                    }}
                  >
                    <Shield size={19} />
                    <span>Удерживать</span>
                  </button>
                  <button
                    onClick={() => {
                      setCommand(true);
                      setPlacing(false);
                      setToast(
                        "Укажите точку сближения. Бой начнётся автоматически.",
                      );
                    }}
                  >
                    <Target size={19} />
                    <span>Атака</span>
                  </button>
                </div>
                <div className="order-note">
                  <Radio size={14} />
                  <span>
                    {unit.target
                      ? "Приказ принят. Маршрут отображён на карте."
                      : "Нет активных приказов. Соединение удерживает позицию."}
                  </span>
                </div>
              </div>
              <div className="inspector-section coordinates">
                <div className="section-label">РАСПОЛОЖЕНИЕ</div>
                <div>
                  <MapPin size={15} />
                  <span>
                    {unit.lat.toFixed(4)}° N &nbsp; {unit.lng.toFixed(4)}° E
                  </span>
                </div>
                <div>
                  <Mountain size={15} />
                  <span>Местность: свободное размещение</span>
                </div>
              </div>
            </>
          ) : (
            <p className="empty-state">Выберите соединение на карте</p>
          )}
          <div className="event-log">
            <div className="section-label">
              ЖУРНАЛ СОБЫТИЙ <span>{logs.length}</span>
            </div>
            {logs.slice(0, 3).map((l, i) => (
              <div className="event" key={`${l}-${i}`}>
                <span className="event-dot" />
                <div>
                  <small>{i === 0 ? time : "06:00:00"}</small>
                  <p>{l}</p>
                </div>
              </div>
            ))}
          </div>
          {unit && (
            <button
              className="delete-unit"
              onClick={() => {
                setUnits((u) => u.filter((v) => v.id !== selected));
                setSelected("");
                log(`Удалено: ${unit.name}`);
              }}
            >
              <Trash2 size={13} />
              Удалить соединение
            </button>
          )}
        </aside>
      </div>
      <footer className="bottom-bar">
        <div>
          <span className="status-light" />
          Система готова
          <span className="separator" />
          <span>
            Соединений: <b>{units.length}</b>
          </span>
          <span className="blue-text">Свои: {friendly.length}</span>
          <span className="red-text">Противник: {opponent.length}</span>
        </div>
        <div>
          <Sun size={13} />
          Ясно <span>+24°C</span>
          <Wind size={13} />
          <span>3 м/с</span>
          <span className="separator" />
          <span>Условная обстановка</span>
          <span className="version">v0.1.0</span>
        </div>
      </footer>
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal("")}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Настройки сценария"
            onKeyDown={(e) => {
              if (e.key !== "Tab") return;
              const focusable = e.currentTarget.querySelectorAll<HTMLElement>(
                "button,input,select",
              );
              const first = focusable[0];
              const last = focusable[focusable.length - 1];
              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last?.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first?.focus();
              }
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close icon-btn"
              autoFocus
              onClick={() => setModal("")}
              aria-label="Закрыть"
            >
              <X />
            </button>
            <span className="section-label">DALA / ПЕСОЧНИЦА</span>
            <h2>
              {modal === "reset"
                ? "Начать заново?"
                : modal === "game"
                  ? "Учебный сценарий"
                  : modal === "settings"
                    ? "Настройки среды"
                    : "Ваша карта. Ваш сценарий."}
            </h2>
            {modal === "reset" ? (
              <>
                <p>
                  Размещение и приказы будут сброшены. Сохранённый сценарий
                  останется в браузере.
                </p>
                <button className="primary" onClick={reset}>
                  Сбросить сценарий
                </button>
              </>
            ) : modal === "game" ? (
              <>
                <p>
                  «Жетысу» — свободное учебное столкновение двух вымышленных
                  сторон. Разместите силы, задайте маршруты и запустите время.
                  Цель: сохранить боеспособность своей группировки.
                </p>
                <p>
                  В версии 0.1 бой автоматический при сближении. Кампания, очки
                  победы и ИИ противника запланированы на следующий этап.
                </p>
                <button className="primary" onClick={() => setModal("")}>
                  Перейти к сценарию
                </button>
              </>
            ) : modal === "settings" ? (
              <>
                <label className="setting-row">
                  Координатная сетка
                  <input
                    type="checkbox"
                    checked={grid}
                    onChange={(e) => setGrid(e.target.checked)}
                  />
                </label>
                <label className="setting-row">
                  Показывать маршруты
                  <input
                    type="checkbox"
                    checked={routes}
                    onChange={(e) => setRoutes(e.target.checked)}
                  />
                </label>
                <p>
                  Погода в прототипе фиксированная. Сценарии сохраняются
                  локально.
                </p>
              </>
            ) : (
              <>
                <p>
                  1. Выберите род войск и масштаб соединения. Нажмите
                  «Разместить на карте» и укажите точку.
                </p>
                <p>
                  2. Выберите соединение, отдайте приказ «Движение» и укажите
                  цель. Пробел запускает или останавливает время.
                </p>
                <p>
                  3. При сближении противников автоматически уменьшаются
                  боеспособность и снабжение. Это условная игровая модель.
                </p>
                <div className="help-note">
                  Знаки — условная система прототипа по визуальному образцу.
                  Соответствие официальным обозначениям ВС Казахстана не
                  подтверждено. Реальные дислокации и характеристики не
                  используются.
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
