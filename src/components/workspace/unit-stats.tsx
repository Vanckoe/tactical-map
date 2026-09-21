import { getUnitStats, UNIT_PROFILES, type Kind, type Echelon } from "@/lib/unit-balance";
export function UnitStats({ kind, echelon }: { kind: Kind; echelon: Echelon }) {
  const stats = getUnitStats({ kind, echelon });
  const rows = [
    ["Дальность огня", stats.rangeKm ? `${stats.minRangeKm ? `${stats.minRangeKm}–` : ""}${stats.rangeKm} км` : "Не ведёт огонь"],
    ["Обнаружение", `${stats.detectionKm} км`],
    ...(stats.supportKm ? [[kind === "ew" ? "Радиус РЭБ" : "Радиус поддержки", `${stats.supportKm} км`]] : []),
    ["Развёртывание", stats.deploySeconds ? `${stats.deploySeconds} с` : "Без задержки"],
    ["Урон при 100%", `${stats.damagePerSecond} ед/с`],
    ["Защита", `${stats.defense} (−${Math.round(stats.defense / (100 + stats.defense) * 100)}% урона)`],
    ["Скорость", `${stats.speedKph} км/ч`],
    ["Прочность", `${stats.durability} ед.`],
    ["Запас ресурсов", `${stats.supplyCapacity} ед.`],
  ];
  return <div className="space-y-3">
    <p className="text-xs leading-relaxed">{UNIT_PROFILES[kind].description}</p>
    <dl className="space-y-2">{rows.map(([label, value]) => <div className="flex items-center justify-between gap-3 text-xs" key={label}><dt className="text-muted-foreground">{label}</dt><dd className="text-right tabular-nums text-foreground">{value}</dd></div>)}</dl>
    <p className="text-[10px] leading-relaxed text-muted-foreground">Размер части меняет мощь, прочность и запас ресурсов, но не дальность оружия. Круг на карте — {stats.supportKm ? "поддержка / РЭБ" : stats.rangeKm ? "дальность огня" : "обнаружение"}. Игровые значения; рельеф и погода пока не учитываются.</p>
  </div>;
}
