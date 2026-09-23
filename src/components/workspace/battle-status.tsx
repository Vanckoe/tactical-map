"use client";
import { useI18n } from "@/components/i18n/language-provider";

import { Button } from "@/components/ui/button";
import type { Sandbox } from "@/hooks/use-sandbox";
const time = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
export function BattleStatus({ game }: { game: Sandbox }) {
  const { t } = useI18n();
  const { scenario, battle } = game;
  if (!scenario) return null;
  const attack = scenario.attackerSide === "blue";
  const defender = attack ? "Противник" : "Свои";
  const nextReserve = scenario.reserves.find((wave) => !battle.releasedReserves.includes(wave.id));
  const result = battle.winner === "blue" ? "Победа" : "Победил противник";
  return <section className="space-y-4" aria-label={t("Состояние сценария")}>
    <div className="flex flex-col gap-2 text-sm"><strong>{t(battle.winner ? result : attack ? "Ваша задача: занять город" : "Ваша задача: удержать город")}</strong><span>{t(game.botEnabled ? "Бот включён" : "Бот выключен")}</span></div>
    <p className="mt-2 flex flex-col gap-2 text-sm tabular-nums"><span>{t("До конца ")}<strong>{t(time(Math.max(0, scenario.timeLimitSeconds - battle.seconds)))}</strong></span><span>{t("Захват ")}<strong>{t(time(battle.cityHeldSeconds))} / {t(time(scenario.holdSeconds))}</strong></span></p>
    <div className="mt-2 text-xs">{scenario.objectives.map((o) => <span key={o.id}>{t(o.name)}: {t(battle.points[o.id]?.contested ? "бой за контроль" : battle.points[o.id]?.owner === "blue" ? "под вашим контролем" : "под контролем противника")}</span>)}</div>
    <p className="mt-2 text-xs text-muted-foreground">{t(nextReserve ? `Резерв обороны через ${time(Math.max(0, nextReserve.releaseSeconds - battle.seconds))}` : "Все резервы обороны введены")}</p>
    <details className="mt-2 text-xs leading-5"><summary className="cursor-pointer">{t("Обстановка и резервы")}</summary>
      <p className="mt-2">{t(scenario.description)}</p>
      <ul className="my-2 space-y-1">{scenario.reserves.map((wave) => <li key={wave.id}>{t(defender)} · {t(wave.name)}: {t(battle.releasedReserves.includes(wave.id) ? "введён в тылу" : `через ${time(Math.max(0, wave.releaseSeconds - battle.seconds))}`)} · {wave.units.length}{t(" части")}</li>)}</ul>
      <p>{t("Наступающим нужно занять город и непрерывно удерживать его 15 минут с боевой частью внутри. Присутствие обороны или уход наступающих сбрасывает отсчёт. Смена контроля занимает до 30 секунд. Оборона побеждает по истечении ")}{scenario.timeLimitSeconds / 60}{t(" минут или при потере всех наземных боевых частей наступления.")}</p>
      <p className="mt-2 text-muted-foreground">{t("Вымышленный игровой сценарий на карте города. Зоны местности условные. Бот реагирует на обнаруженные цели; резервам требуется время на движение после ввода.")}</p>
    </details>
    {battle.winner && <><p className="mt-2 text-xs">{t(battle.cityHeldSeconds >= scenario.holdSeconds ? "Наступающие закрепились в городе." : battle.seconds >= scenario.timeLimitSeconds ? "Время наступления истекло." : "Наступающая группировка потеряла боеспособность.")}</p><Button className="mt-2 w-full" size="sm" onClick={game.reset}>{t("Начать заново")}</Button></>}
  </section>;
}
