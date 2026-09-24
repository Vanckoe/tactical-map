"use client";
import { useState } from "react";
import { useI18n } from "@/components/i18n/language-provider";
import { Button } from "@/components/ui/button";
import type { Sandbox } from "@/hooks/use-sandbox";
import { boardableUnits, passengersOf, TRANSPORT_CAPACITY, TRANSFER_SECONDS } from "@/lib/transport";
import type { Unit } from "@/lib/simulation";

export function TransportControls({ game, carrier }: { game: Sandbox; carrier: Unit }) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<string[]>([]);
  const passengers = passengersOf(game.units, carrier.id);
  const nearby = boardableUnits(game.units, carrier);
  const op = carrier.transportOperation;
  const disabled = carrier.hp <= 0 || !!game.battle.winner || (game.botEnabled && carrier.side === "red");
  const boarding = nearby.filter((u) => selected.includes(u.id));
  const leaving = passengers.filter((u) => selected.includes(u.id));
  const toggle = (id: string) => setSelected((ids) => ids.includes(id) ? ids.filter((v) => v !== id) : [...ids, id]);
  const list = (units: Unit[]) => units.map((u) => <label key={u.id} className="flex cursor-pointer items-center gap-2 py-1.5 text-xs">
    <input type="checkbox" className="size-4 accent-current" checked={op ? op.unitIds.includes(u.id) : selected.includes(u.id)} disabled={disabled || !!op} onChange={() => toggle(u.id)} />
    <span>{t(u.name)}</span>
  </label>);
  return <section className="space-y-3 border-b p-4" aria-label={t("Перевозка войск")}>
    <div className="flex justify-between text-sm font-medium"><h3>{t("Перевозка войск")}</h3><span className="tabular-nums">{passengers.length}/{TRANSPORT_CAPACITY}</span></div>
    <p className="text-xs text-muted-foreground">{t("100 км/ч · Вместимость: 5 взводов")}</p>
    {passengers.length ? <fieldset><legend className="text-xs text-muted-foreground">{t("В транспорте")}</legend>{list(passengers)}</fieldset> : <p className="text-xs text-muted-foreground">{t("Транспорт пуст")}</p>}
    {op ? <div className="space-y-2" role="status">
      <div className="flex justify-between text-xs"><span>{t(op.type === "board" ? "Посадка" : "Высадка")} · {op.unitIds.length}</span><span className="tabular-nums">{Math.floor(op.remainingSeconds / 60)}:{String(Math.ceil(op.remainingSeconds % 60)).padStart(2, "0")}</span></div>
      <progress className="transport-progress w-full" aria-label={t(op.type === "board" ? "Посадка" : "Высадка")} max={TRANSFER_SECONDS} value={TRANSFER_SECONDS - op.remainingSeconds} />
      <p className="text-xs text-muted-foreground">{t(game.running ? "Операция выполняется. Транспорт стоит." : "На паузе. Запустите симуляцию для продолжения.")}</p>
      <Button size="sm" variant="outline" disabled={disabled} onClick={game.cancelTransfer}>{t("Отменить операцию")}</Button>
    </div> : <>
      {nearby.length > 0 && <fieldset><legend className="text-xs text-muted-foreground">{t("Рядом · до 100 м")}</legend>{list(nearby)}</fieldset>}
      <p className="text-xs text-muted-foreground">{t(carrier.target ? "Для посадки или высадки остановите транспорт." : "Выберите взводы. Посадка и высадка — по 5 игровых минут.")}</p>
      {!nearby.length && <p className="text-xs text-muted-foreground">{t("Для посадки подведите взводы на 100 м к транспорту.")}</p>}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" disabled={disabled || !!carrier.target || !boarding.length || boarding.length + passengers.length > TRANSPORT_CAPACITY} onClick={() => { game.transfer("board", boarding.map((u) => u.id)); setSelected([]); }}>{t("Посадить")}{boarding.length ? ` (${boarding.length})` : ""}</Button>
        <Button variant="outline" size="sm" disabled={disabled || !!carrier.target || !leaving.length} onClick={() => { game.transfer("disembark", leaving.map((u) => u.id)); setSelected([]); }}>{t("Высадить")}{leaving.length ? ` (${leaving.length})` : ""}</Button>
      </div>
    </>}
  </section>;
}
