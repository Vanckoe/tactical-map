/** Игровой баланс, не реальные ТТХ. Все 42 сочетания редактируются независимо. */
export type Kind =
  "infantry" | "armor" | "artillery" | "air" | "drone" | "airdefense";
export const ECHELONS = [
  "Отделение",
  "Взвод",
  "Рота",
  "Батальон",
  "Полк",
  "Бригада",
  "Дивизия",
] as const;
export type Echelon = (typeof ECHELONS)[number];
export type UnitStats = {
  rangeKm: number;
  damagePerSecond: number; // Условные очки урона при полной боеспособности.
  defense: number; // Поглощение = defense / (100 + defense).
  speedKph: number; // Км за час симуляции, не реального времени.
  durability: number; // Очки прочности; интерфейс показывает остаток в процентах.
};
function stats(
  rangeKm: number,
  damagePerSecond: number,
  defense: number,
  speedKph: number,
  durability: number,
): UnitStats {
  return { rangeKm, damagePerSecond, defense, speedKph, durability };
}
//                               км    урон/с  защита км/ч прочность
export const UNIT_BALANCE: Record<Kind, Record<Echelon, UnitStats>> = {
  infantry: {
    Отделение: stats(0.6, 0.4, 8, 36, 60),
    Взвод: stats(0.8, 1.1, 10, 34, 160),
    Рота: stats(1.2, 3.2, 14, 32, 420),
    Батальон: stats(1.8, 8, 18, 28, 1100),
    Полк: stats(2, 19, 22, 25, 2800),
    Бригада: stats(2.2, 28, 26, 23, 4200),
    Дивизия: stats(2.5, 66, 32, 19, 11000),
  },
  armor: {
    Отделение: stats(1.2, 0.8, 50, 48, 110),
    Взвод: stats(1.6, 2.2, 55, 46, 280),
    Рота: stats(2, 6, 60, 43, 750),
    Батальон: stats(2.5, 15, 65, 39, 1900),
    Полк: stats(2.7, 35, 70, 35, 4800),
    Бригада: stats(3, 52, 75, 32, 7200),
    Дивизия: stats(3.2, 120, 80, 27, 18500),
  },
  artillery: {
    Отделение: stats(4, 1.2, 4, 30, 45),
    Взвод: stats(6, 3, 6, 28, 120),
    Рота: stats(9, 8, 8, 26, 320),
    Батальон: stats(12, 20, 10, 24, 850),
    Полк: stats(16, 48, 12, 21, 2200),
    Бригада: stats(20, 70, 14, 19, 3300),
    Дивизия: stats(24, 160, 18, 16, 8500),
  },
  air: {
    Отделение: stats(3, 1.5, 10, 440, 70),
    Взвод: stats(4, 4, 12, 430, 190),
    Рота: stats(5, 10, 14, 420, 500),
    Батальон: stats(6, 25, 16, 400, 1300),
    Полк: stats(7, 60, 18, 380, 3400),
    Бригада: stats(8, 88, 20, 360, 5000),
    Дивизия: stats(9, 200, 24, 320, 13000),
  },
  drone: {
    Отделение: stats(1, 0.2, 0, 100, 25),
    Взвод: stats(1.5, 0.6, 1, 96, 65),
    Рота: stats(2, 1.6, 2, 92, 170),
    Батальон: stats(2.5, 4, 3, 86, 440),
    Полк: stats(3, 10, 4, 80, 1100),
    Бригада: stats(3.5, 15, 5, 74, 1700),
    Дивизия: stats(4, 35, 6, 66, 4400),
  },
  airdefense: {
    Отделение: stats(3, 1, 12, 34, 70),
    Взвод: stats(5, 2.8, 16, 32, 180),
    Рота: stats(8, 7.5, 20, 30, 480),
    Батальон: stats(12, 19, 24, 27, 1250),
    Полк: stats(16, 45, 28, 24, 3200),
    Бригада: stats(20, 66, 32, 21, 4800),
    Дивизия: stats(25, 150, 38, 18, 12500),
  },
};
/** Строка — атакующий, столбец — цель. Ноль означает недоступный тип цели. */
export const DAMAGE_MULTIPLIERS: Record<Kind, Record<Kind, number>> = {
  infantry: {
    infantry: 1,
    armor: 0.35,
    artillery: 1,
    air: 0,
    drone: 0.2,
    airdefense: 0.7,
  },
  armor: {
    infantry: 1.1,
    armor: 1,
    artillery: 1.2,
    air: 0,
    drone: 0,
    airdefense: 1,
  },
  artillery: {
    infantry: 1.3,
    armor: 0.65,
    artillery: 1,
    air: 0,
    drone: 0,
    airdefense: 1,
  },
  air: {
    infantry: 1,
    armor: 1.1,
    artillery: 1.2,
    air: 0.6,
    drone: 0.4,
    airdefense: 0.8,
  },
  drone: {
    infantry: 0.6,
    armor: 0.8,
    artillery: 1,
    air: 0,
    drone: 0,
    airdefense: 0.7,
  },
  airdefense: {
    infantry: 0,
    armor: 0,
    artillery: 0,
    air: 1.5,
    drone: 1.2,
    airdefense: 0,
  },
};
export const SUPPLY_COST = { movementPerKm: 0.15, firingPerSecond: 0.08 };
export function isEchelon(value: unknown): value is Echelon {
  return typeof value === "string" && ECHELONS.some((e) => e === value);
}
export function getUnitStats(unit: {
  kind: Kind;
  echelon: Echelon;
}): UnitStats {
  return UNIT_BALANCE[unit.kind][unit.echelon];
}
