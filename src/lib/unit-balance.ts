/** Abstract game balance. Values are not equipment specifications. */
export const KIND_IDS = ["infantry", "armor", "artillery", "air", "drone", "airdefense", "recon", "antitank", "engineer", "logistics", "medical", "ew", "transport"] as const;
export type Kind = (typeof KIND_IDS)[number];
export const ECHELONS = ["Отделение", "Взвод", "Рота", "Батальон", "Полк", "Бригада", "Дивизия"] as const;
export type Echelon = (typeof ECHELONS)[number];
export type UnitRole = "combat" | "recon" | "support";
export type UnitProfile = {
  label: string; short: string; role: UnitRole; description: string;
  airborne: boolean; rangeKm: number; minRangeKm: number; detectionKm: number;
  supportKm: number; deploySeconds: number; fireOnMove: boolean;
  damagePerSecond: number; defense: number; speedKph: number; durability: number;
  movementCost: number; firingCost: number; supplyCapacity: number;
  echelons: readonly Echelon[];
};
const ground: UnitProfile = {
  label: "", short: "", role: "combat", description: "", airborne: false,
  rangeKm: 1.8, minRangeKm: 0, detectionKm: 3, supportKm: 0, deploySeconds: 0,
  fireOnMove: true, damagePerSecond: 8, defense: 18, speedKph: 28, durability: 1100,
  movementCost: 0.4, firingCost: 0.08, supplyCapacity: 1000, echelons: ECHELONS,
};
const specialists: readonly Echelon[] = ["Взвод", "Рота", "Батальон"];
export const UNIT_PROFILES: Record<Kind, UnitProfile> = {
  transport: { ...ground, label: "Транспорт", short: "тр", role: "support", speedKph: 100, rangeKm: 0, damagePerSecond: 0, detectionKm: 1.5, defense: 10, echelons: ["Взвод"], description: "Перевозит до пяти взводов мотопехоты. Посадка и высадка занимают 5 игровых минут. Не атакует." },
  infantry: { ...ground, label: "Мотопехота", short: "мсб", description: "Универсальное наземное подразделение. В движении стреляет менее эффективно; на месте постепенно укрепляет позицию." },
  armor: { ...ground, label: "Танковые", short: "тб", rangeKm: 2.5, defense: 65, speedKph: 39, durability: 1900, damagePerSecond: 15, movementCost: 1.1, firingCost: 0.12, description: "Защищённая ударная сила против наземных целей. Расходует больше снабжения на движение, уязвима для противотанковых частей." },
  artillery: { ...ground, label: "Артиллерия", short: "адн", rangeKm: 12, minRangeKm: 2, detectionKm: 2, deploySeconds: 30, fireOnMove: false, defense: 10, speedKph: 24, durability: 850, damagePerSecond: 20, firingCost: 0.3, echelons: ["Взвод", "Рота", "Батальон", "Полк", "Бригада"], description: "Огонь только с развёрнутой позиции по обнаруженным союзниками наземным целям. Есть мёртвая зона; движение сбрасывает развёртывание. Сильно подавляет цель." },
  air: { ...ground, label: "Ударная авиация", short: "ав", airborne: true, rangeKm: 6, detectionKm: 8, defense: 16, speedKph: 400, durability: 1300, damagePerSecond: 25, movementCost: 0.6, firingCost: 0.25, echelons: ["Рота", "Батальон", "Полк"], description: "Быстро перемещается и поражает наземные цели. Не ведёт воздушный бой; уязвима для ПВО. Расходует снабжение даже без приказа на движение." },
  drone: { ...ground, label: "Разведывательные БПЛА", short: "бпла", role: "recon", airborne: true, rangeKm: 0, detectionKm: 10, damagePerSecond: 0, defense: 3, speedKph: 86, durability: 440, movementCost: 0.2, echelons: specialists, description: "Не атакуют: обнаруживают цели для всей своей стороны, в том числе артиллерии. В зоне РЭБ дальность обнаружения и скорость снижаются." },
  airdefense: { ...ground, label: "ПВО", short: "зрдн", rangeKm: 12, detectionKm: 14, deploySeconds: 10, fireOnMove: false, defense: 24, speedKph: 27, durability: 1250, damagePerSecond: 19, firingCost: 0.2, echelons: ["Взвод", "Рота", "Батальон", "Полк", "Бригада"], description: "Обнаруживает воздушные средства на большой дистанции и поражает только авиацию и БПЛА. После перемещения требуется развёртывание." },
  recon: { ...ground, label: "Разведка", short: "рр", role: "recon", detectionKm: 9, rangeKm: 0.8, damagePerSecond: 2, defense: 10, speedKph: 42, durability: 650, echelons: specialists, description: "Расширяет общее поле обнаружения наземных целей. Вооружение предназначено для ближнего боя, а не для столкновения с танками." },
  antitank: { ...ground, label: "Противотанковые", short: "пт", rangeKm: 3.5, minRangeKm: 0.2, detectionKm: 4, deploySeconds: 8, fireOnMove: false, damagePerSecond: 12, defense: 12, speedKph: 26, durability: 700, firingCost: 0.18, echelons: specialists, description: "Приоритет — бронетехника. Сильны против танков, слабее против пехоты. Стреляют после остановки и развёртывания." },
  engineer: { ...ground, label: "Инженерные", short: "исб", role: "support", rangeKm: 0.6, damagePerSecond: 1.5, supportKm: 1.5, defense: 12, durability: 900, echelons: specialists, description: "На месте ускоряют укрепление ближайшего неподвижного наземного союзника. Инженерные работы расходуют снабжение и прекращаются под огнём." },
  logistics: { ...ground, label: "Снабжение", short: "обмо", role: "support", rangeKm: 0, damagePerSecond: 0, supportKm: 2, defense: 4, speedKph: 32, durability: 800, supplyCapacity: 6000, echelons: specialists, description: "Передают конечный запас ресурсов одному ближайшему неподвижному союзнику. Не пополняют другие части снабжения; под огнём разгрузка прекращается." },
  medical: { ...ground, label: "Медицинские", short: "мед", role: "support", rangeKm: 0, damagePerSecond: 0, supportKm: 1.5, defense: 2, durability: 500, echelons: specialists, description: "Восстанавливают только обратимую часть потерь наземных подразделений: до четверти полученного урона. Не восстанавливают уничтоженные части и не работают под огнём." },
  ew: { ...ground, label: "РЭБ", short: "рэб", role: "support", rangeKm: 0, damagePerSecond: 0, supportKm: 6, deploySeconds: 15, fireOnMove: false, defense: 6, durability: 600, echelons: specialists, description: "После развёртывания подавляют вражеские БПЛА в радиусе действия. Снижают их обзор и скорость, расходуют ресурс при активных помехах. Эффекты нескольких станций не складываются." },
};
export const kinds = KIND_IDS.map((id) => ({ id, ...UNIT_PROFILES[id] }));
const scale: Record<Echelon, number> = { Отделение: 0.06, Взвод: 0.15, Рота: 0.4, Батальон: 1, Полк: 2.5, Бригада: 3.8, Дивизия: 10 };
export type UnitStats = Pick<UnitProfile, "rangeKm" | "minRangeKm" | "detectionKm" | "supportKm" | "deploySeconds" | "damagePerSecond" | "defense" | "speedKph" | "durability" | "supplyCapacity">;
export function getUnitStats(unit: { kind: Kind; echelon: Echelon }): UnitStats {
  const p = UNIT_PROFILES[unit.kind], size = scale[unit.echelon];
  return { rangeKm: p.rangeKm, minRangeKm: p.minRangeKm, detectionKm: p.detectionKm, supportKm: p.supportKm, deploySeconds: p.deploySeconds,
    damagePerSecond: Number((p.damagePerSecond * size).toFixed(2)), defense: p.defense,
    speedKph: p.speedKph, durability: p.durability * size, supplyCapacity: p.supplyCapacity * size };
}
export function damageMultiplier(attacker: Kind, target: Kind): number {
  if (attacker === "transport" || attacker === "medical" || attacker === "logistics" || attacker === "ew" || attacker === "drone") return 0;
  if (attacker === "airdefense") return target === "air" ? 1.5 : target === "drone" ? 1.2 : 0;
  if (UNIT_PROFILES[target].airborne) return 0;
  if (attacker === "antitank") return target === "armor" ? 2 : 0.35;
  if (attacker === "recon" || attacker === "engineer") return target === "armor" ? 0.1 : 0.5;
  if (attacker === "infantry") return target === "armor" ? 0.35 : 1;
  if (attacker === "artillery") return target === "armor" ? 0.65 : 1.3;
  if (attacker === "air") return target === "armor" ? 1.1 : 1;
  return target === "armor" ? 1 : 1.1;
}
export function isEchelon(value: unknown): value is Echelon { return typeof value === "string" && ECHELONS.some((e) => e === value); }
export function echelonLabel(kind: Kind, echelon: Echelon) {
  if (kind === "air") return ({ Рота: "Звено", Батальон: "Эскадрилья", Полк: "Авиаполк" } as Partial<Record<Echelon, string>>)[echelon] ?? echelon;
  if (kind === "artillery" || kind === "airdefense") return echelon === "Рота" ? "Батарея" : echelon === "Батальон" ? "Дивизион" : echelon;
  return echelon;
}
