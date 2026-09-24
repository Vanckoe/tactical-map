"use client";
import { useI18n } from "@/components/i18n/language-provider";

import { Button } from "@/components/ui/button";
import type { Sandbox } from "@/hooks/use-sandbox";
import { intruderVisible } from "@/lib/border-patrol";
const time = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
export function BattleStatus({ game }: { game: Sandbox }) {
  const { t } = useI18n();
  const { scenario, battle } = game;
  if (!scenario) return null;
  if (scenario.borderPatrol) {
    const result = battle.borderOutcome === "captured" ? "Нарушитель задержан. Победа пограничников." : battle.borderOutcome === "escaped" ? "Нарушитель достиг Петропавла. Победа противника." : battle.borderOutcome === "timeout" ? "Время поиска истекло. Ничья: нарушитель не задержан и не достиг города." : "Ваша задача: задержать нарушителя";
    return <section className="space-y-4 text-sm" aria-label={t("Состояние сценария")}>
      <strong className="block" role="status">{t(result)}</strong>
      <p>{t(game.botEnabled ? "Бот включён" : "Бот выключен")}</p>
      <p className="tabular-nums">{t("До конца ")}<strong>{time(Math.max(0, scenario.timeLimitSeconds - battle.seconds))}</strong></p>
      <p>{t(!game.botEnabled ? "Ручное управление: все войска противника видны и доступны для приказов." : intruderVisible(battle.units, scenario) ? "Нарушитель в поле зрения" : battle.lastKnownIntruder ? "Контакт потерян. Серый маркер — последнее известное место." : "Нарушитель пока не обнаружен")}</p>
      <p className="text-xs leading-5">{t("Обзор взвода — 1.5 км. Внешний круг показывает обзор, внутренний — задержание на 600 м.")}</p>
      <p className="text-xs text-muted-foreground">{t("Снабжение отключено для всех сторон")}</p>
      <p className="text-xs leading-5">{t("Для задержания подведите любой взвод к нарушителю на 600 м. Стрельба отключена. Нарушитель побеждает при входе в отмеченную зону Петропавла; удерживать город не требуется.")}</p>
      <details className="text-xs leading-5"><summary className="cursor-pointer">{t("Обстановка и правила")}</summary>
        <p className="mt-2">{t(scenario.description)}</p>
        <ul className="mt-2 space-y-1">{scenario.borderPatrol.outposts.map((post) => <li key={post.name}>{t(post.name)} — {t("3 взвода мотопехоты")}</li>)}</ul>
        <p className="mt-2">{t("Игровая граница условная. После первого входа нарушитель остаётся внутри отмеченной территории. Лимит поиска — 180 игровых минут.")}</p>
      </details>
      {battle.winner && <Button className="w-full" size="sm" onClick={game.reset}>{t("Начать заново")}</Button>}
    </section>;
  }
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
