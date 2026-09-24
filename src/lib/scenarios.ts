import { bulaevoTerritory, bulaevoSearchArea } from "./bulaevo-territory";
import { borderTerritory } from "./border-territory";
import type { Unit } from "./simulation";
import { kinds, type Kind, type Echelon } from "./unit-balance";
import { offset, type TerrainZone } from "./terrain";
import type { Position } from "./geo";
export type Objective = Position & { id: string; name: string; radiusKm: number };
export type ReserveWave = { id: string; name: string; releaseSeconds: number; units: Unit[] };
export type Scenario = {
  id: string; name: string; region: string; description: string; center: [number, number];
  terrain: TerrainZone[]; objectives: Objective[]; units: Unit[]; reserves: ReserveWave[];
  redBase: Position; blueBase: Position; attackerSide: Unit["side"]; timeLimitSeconds: number; holdSeconds: number;
  supplyDisabled?: boolean;
  borderPatrol?: {
    intruderId: string; entry: Position; captureRadiusKm: number; detectionRadiusKm: number;
    territory: { south: number; north: number; west: number; east: number; polygon: [number, number][] };
    outposts: (Position & { name: string; platoons?: number })[];
    starts?: Position[];
    searchArea?: [number, number][];
  };
};
// Offsets and forces describe fictional game situations, not actual deployments or terrain surveys.
type Deployment = [Kind, Echelon, number, number];
function createScenario(id: string, city: string, center: [number, number], attackerSide: Unit["side"], attackBase: [number, number], rear: [number, number], minutes: number, reserveMinute: number, variant: number): Scenario {
  const origin = { lat: center[0], lng: center[1] };
  const defenderSide = attackerSide === "blue" ? "red" : "blue";
  const attacking = offset(origin, ...attackBase), defending = offset(origin, ...rear);
  let serial = 0;
  function deploy(side: Unit["side"], base: Position, rows: Deployment[], group: string): Unit[] {
    return rows.map(([kind, echelon, x, y]) => ({ id: String(++serial), name: `${group} ${serial} · ${kinds.find((k) => k.id === kind)!.label}`, kind, echelon, side, ...offset(base, x, y), hp: 100, supply: 100, order: "Удержание", entrenchment: group === "Гарнизон" ? 0.8 : 0, stationarySeconds: 120 }));
  }
  const assault: Deployment[] = [
    ["infantry", "Рота", 0, 0], ["infantry", "Рота", -1.6, 0.9], ["infantry", "Рота", 1.1, -1.3],
    ["armor", "Взвод", -0.8, -0.7], ["recon", "Взвод", 1.9, 1.2],
    ["artillery", "Взвод", -2.2, -1.8], ["logistics", "Рота", -3, 0.3], ["engineer", "Взвод", -2, 2],
  ];
  if (variant === 1) assault.push(["armor", "Взвод", 2, -2]);
  if (variant === 2) assault.push(["infantry", "Взвод", 0.5, 2.3], ["medical", "Взвод", -3.5, -1]);
  const garrison: Deployment[] = [
    ["infantry", "Взвод", -0.4, 0.2], ["infantry", "Взвод", 0.8, -0.6],
    ["antitank", "Взвод", -1.2, -0.8], ["engineer", "Отделение", 0.4, 0.6],
  ];
  const first: Deployment[] = [["infantry", "Рота", 0, 0], ["armor", "Взвод", 1, 0.8], ["logistics", "Рота", -1.1, 0.5]];
  const second: Deployment[] = variant === 1
    ? [["infantry", "Взвод", 1.5, -1], ["antitank", "Взвод", -0.8, -1.3]]
    : [["infantry", "Рота", 1.5, -1], ["medical", "Взвод", -0.8, -1.3]];
  const reserves = [
    { id: "first", name: "Основной резерв", releaseSeconds: reserveMinute * 60, units: deploy(defenderSide, defending, first, "Резерв I") },
    { id: "second", name: "Вторая очередь", releaseSeconds: (reserveMinute + 18) * 60, units: deploy(defenderSide, offset(defending, 2, 1), second, "Резерв II") },
  ];
  return {
    id, name: `${city} · ${attackerSide === "blue" ? "Атака" : "Оборона"}`, region: city, center, attackerSide,
    blueBase: attackerSide === "blue" ? attacking : defending, redBase: attackerSide === "red" ? attacking : defending,
    timeLimitSeconds: minutes * 60, holdSeconds: 15 * 60, reserves,
    description: `Наступающая группа начинает примерно в 30 км от города. В городе — три боевых взвода и инженерное отделение. Резервы обороны собираются в тылу, примерно в ${Math.round(Math.hypot(...rear))} км от центра: первая очередь доступна через ${reserveMinute} мин, вторая — через ${reserveMinute + 18} мин. После ввода им ещё предстоит марш.`,
    units: [...deploy(attackerSide, attacking, assault, "Наступление"), ...deploy(defenderSide, origin, garrison, "Гарнизон")],
    objectives: [{ id: "city", name: "Город", ...origin, radiusKm: 1.6 }],
    terrain: [
      { id: "town", label: "Условная городская застройка", type: "urban", ...origin, radiusKm: 2 },
      { id: "rough", label: "Условный пересечённый участок", type: "rough", ...offset(origin, variant === 1 ? -6 : 4, -4), radiusKm: 2.4 },
      { id: "approach", label: "Условный участок трудного движения", type: "rough", ...offset(origin, attackBase[0] * 0.45 + 2, attackBase[1] * 0.45 - 2), radiusKm: 2 },
    ],
  };
}
function createBorderPatrol(): Scenario {
  const city = { lat: 54.8734, lng: 69.1507 };
  const outposts = [
    { name: "Афонькино", lat: 54.9066, lng: 68.2699 },
    { name: "Белое", lat: 55.0628, lng: 68.4739 },
    { name: "Мамлют", lat: 54.9411, lng: 68.5462 },
  ];
  const start = { lat: 55.005, lng: 68.18 };
  return {
    id: "petropavl-border", name: "Петропавл · Пограничный поиск", region: "Петропавл",
    center: [city.lat, city.lng], attackerSide: "red", blueBase: outposts[2], redBase: start,
    timeLimitSeconds: 3 * 60 * 60, holdSeconds: 0, supplyDisabled: true,
    description: "От пограничников РФ поступило сообщение: человек незаконно пересёк границу на линии железной дороги. В игре нарушитель представлен одним отделением мотопехоты. На заставах Афонькино, Белое и Мамлют — по три взвода мотопехоты. Задержите нарушителя до его прибытия в Петропавл. Снабжение и огонь отключены. Граница и место входа условные, для игровой механики.",
    borderPatrol: {
      intruderId: "10", entry: { lat: 55.005, lng: 68.23 }, captureRadiusKm: 0.6, detectionRadiusKm: 1.5,
      territory: borderTerritory, outposts,
    },
    units: [
      ...outposts.flatMap((base, i) => [-1, 0, 1].map((spread, j): Unit => ({
        id: String(i * 3 + j + 1), name: `${base.name} · Взвод ${j + 1}`,
        kind: "infantry", echelon: "Взвод", side: "blue", ...offset(base, spread * 0.45, j === 1 ? 0.4 : 0),
        hp: 100, supply: 100, order: "Удержание",
      }))),
      { id: "10", name: "Нарушитель", kind: "infantry", echelon: "Отделение", side: "red", ...start, hp: 100, supply: 100, order: "К границе" },
    ],
    objectives: [{ id: "city", name: "Петропавл", ...city, radiusKm: 1.6 }], reserves: [], terrain: [],
  };
}
function createLostTrail(): Scenario {
  const city = { lat: 54.896056, lng: 70.448157 };
  const base = { lat: 54.8734, lng: 69.1507 };
  const outposts = [
    { name: "Поисковая группа 1", lat: 55.07, lng: 70.05, platoons: 1 },
    { name: "Поисковая группа 2", lat: 55.10, lng: 70.48, platoons: 1 },
    { name: "Поисковая группа 3", lat: 54.96, lng: 70.58, platoons: 1 },
  ];
  const starts = [{ lat: 55.17, lng: 70.3 }, { lat: 55.23, lng: 70.45 }, { lat: 55.23, lng: 70.7 }];
  const platoon = (id: string, name: string, position: Position): Unit => ({ id, name, ...position, kind: "infantry", echelon: "Взвод", side: "blue", hp: 100, supply: 100, order: "Удержание" });
  return {
    id: "bulaevo-lost-trail", name: "Булаево · Потерянный след", region: "Булаево",
    center: [55.02, 69.95], attackerSide: "red", blueBase: base, redBase: starts[0],
    timeLimitSeconds: 120 * 60, holdSeconds: 0, supplyDisabled: true,
    description: "Сообщение о пересечении границы поступило с опозданием. Нарушитель уже в Казахстане и направляется к Булаево. Известен только общий район поиска. Три взвода ищут нарушителя; ещё три находятся в транспорте в Петропавле. Доставьте резерв и задержите нарушителя. Все позиции и события вымышлены.",
    borderPatrol: { intruderId: "8", entry: starts[0], captureRadiusKm: 0.6, detectionRadiusKm: 1.5, territory: bulaevoTerritory, starts, searchArea: bulaevoSearchArea, outposts },
    units: [
      ...outposts.map((post, i) => platoon(String(i + 1), post.name, post)),
      ...[4, 5, 6].map((id): Unit => ({ ...platoon(String(id), `Резерв · Взвод ${id - 3}`, base), carrierId: "7", order: "В транспорте" })),
      { id: "7", name: "Петропавл · Транспорт", ...base, kind: "transport", echelon: "Взвод", side: "blue", hp: 100, supply: 100, order: "Удержание" },
      { id: "8", name: "Нарушитель", ...starts[0], kind: "infantry", echelon: "Отделение", side: "red", hp: 100, supply: 100, order: "К городу" },
    ],
    objectives: [{ id: "city", name: "Булаево", ...city, radiusKm: 1.6 }], terrain: [], reserves: [],
  };
}
export const SCENARIOS: Scenario[] = [
  createScenario("esik-attack", "Есик", [43.355, 77.462], "blue", [-27, 13], [10, 3], 120, 48, 0),
  createScenario("kaskelen-defense", "Каскелен", [43.202, 76.623], "red", [-24, 18], [9, 7], 115, 42, 1),
  createScenario("talgar-attack", "Талгар", [43.303, 77.239], "blue", [8, 29], [-11, 2], 125, 55, 2),
  createScenario("esik-defense", "Есик", [43.355, 77.462], "red", [-29, 8], [12, 4], 120, 50, 2),
  createBorderPatrol(),
  createLostTrail(),
];
export const getScenario = (id: string) => SCENARIOS.find((s) => s.id === id);
