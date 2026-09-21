import { getUnitStats, type Kind, type Echelon } from "@/lib/unit-balance";
export function UnitStats({ kind, echelon }: { kind: Kind; echelon: Echelon }) {
  const stats = getUnitStats({ kind, echelon });
  const rows = [
    ["Дальность огня", `${stats.rangeKm} км`],
    ["Урон при 100%", `${stats.damagePerSecond} ед/с`],
    [
      "Защита",
      `${stats.defense} (−${Math.round((stats.defense / (100 + stats.defense)) * 100)}% урона)`,
    ],
    ["Скорость", `${stats.speedKph} км/ч`],
    ["Прочность", `${stats.durability} ед.`],
  ];
  return (
    <div className="space-y-3">
      <dl className="space-y-2">
        {rows.map(([label, value]) => (
          <div
            className="flex items-center justify-between gap-3 text-xs"
            key={label}
          >
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right tabular-nums text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-[10px] leading-relaxed text-muted-foreground">
        Игровые характеристики. Итоговый урон зависит от состояния соединения,
        типа цели и её защиты. Круг на карте — дальность огня.
      </p>
    </div>
  );
}
