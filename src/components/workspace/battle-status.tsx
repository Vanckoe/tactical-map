"use client";
import { Button } from "@/components/ui/button";
import type { Sandbox } from "@/hooks/use-sandbox";
const time = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
export function BattleStatus({ game }: { game: Sandbox }) {
  const { scenario, battle } = game;
  if (!scenario) return null;
  const attack = scenario.attackerSide === "blue";
  const defender = attack ? "Противник" : "Свои";
  const nextReserve = scenario.reserves.find((wave) => !battle.releasedReserves.includes(wave.id));
  const result = battle.winner === "blue" ? "Победа" : "Победил противник";
  return <section className={`battle-status floating-surface ${battle.winner ? "battle-ended" : ""}`} aria-label="Состояние сценария">
    <div className="flex items-center justify-between gap-3 text-xs"><strong>{battle.winner ? result : attack ? "Ваша задача: занять город" : "Ваша задача: удержать город"}</strong><span>{game.botEnabled ? "Бот включён" : "Бот выключен"}</span></div>
    <p className="mt-2 flex justify-between gap-4 text-sm tabular-nums"><span>До конца <strong>{time(Math.max(0, scenario.timeLimitSeconds - battle.seconds))}</strong></span><span>Захват <strong>{time(battle.cityHeldSeconds)} / {time(scenario.holdSeconds)}</strong></span></p>
    <div className="mt-2 text-xs">{scenario.objectives.map((o) => <span key={o.id}>{o.name}: {battle.points[o.id]?.contested ? "бой за контроль" : battle.points[o.id]?.owner === "blue" ? "под вашим контролем" : "под контролем противника"}</span>)}</div>
    <p className="mt-2 text-xs text-muted-foreground">{nextReserve ? `Резерв обороны через ${time(Math.max(0, nextReserve.releaseSeconds - battle.seconds))}` : "Все резервы обороны введены"}</p>
    <details className="mt-2 max-h-[45vh] overflow-y-auto text-xs leading-5"><summary className="cursor-pointer">Обстановка и резервы</summary>
      <p className="mt-2">{scenario.description}</p>
      <ul className="my-2 space-y-1">{scenario.reserves.map((wave) => <li key={wave.id}>{defender} · {wave.name}: {battle.releasedReserves.includes(wave.id) ? "введён в тылу" : `через ${time(Math.max(0, wave.releaseSeconds - battle.seconds))}`} · {wave.units.length} части</li>)}</ul>
      <p>Наступающим нужно занять город и непрерывно удерживать его 15 минут с боевой частью внутри. Присутствие обороны или уход наступающих сбрасывает отсчёт. Смена контроля занимает до 30 секунд. Оборона побеждает по истечении {scenario.timeLimitSeconds / 60} минут или при потере всех наземных боевых частей наступления.</p>
      <p className="mt-2 text-muted-foreground">Вымышленный игровой сценарий на карте города. Зоны местности условные. Бот реагирует на обнаруженные цели; резервам требуется время на движение после ввода.</p>
    </details>
    {battle.winner && <><p className="mt-2 text-xs">{battle.cityHeldSeconds >= scenario.holdSeconds ? "Наступающие закрепились в городе." : battle.seconds >= scenario.timeLimitSeconds ? "Время наступления истекло." : "Наступающая группировка потеряла боеспособность."}</p><Button className="mt-2 w-full" size="sm" onClick={game.reset}>Начать заново</Button></>}
  </section>;
}
