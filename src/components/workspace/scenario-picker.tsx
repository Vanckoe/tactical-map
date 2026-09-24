"use client";
import { useI18n } from "@/components/i18n/language-provider";

import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";
import { Flag, PanelRightClose } from "lucide-react";
import { SCENARIOS } from "@/lib/scenarios";
import type { Sandbox } from "@/hooks/use-sandbox";

export function ScenarioPicker({ game, onClose }: {
  game: Sandbox;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  const start = (id: string) => {
    game.selectScenario(id);
    onClose();
  };
  return <aside className="scenario-picker floating-surface" aria-labelledby="scenario-picker-title" onKeyDown={(event) => {
    if (event.key === "Escape") { event.stopPropagation(); onClose(); }
  }}>
      <header className="shrink-0 space-y-3 border-b p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 id="scenario-picker-title" ref={heading} tabIndex={-1} className="flex items-center gap-2 text-sm font-semibold outline-none"><Flag className="size-4" />{t("Выбор сценария")}</h2>
          <Button variant="ghost" size="icon-sm" aria-label={t("Закрыть выбор сценария")} onClick={onClose}><PanelRightClose /></Button>
        </div>
        <p className="text-xs text-muted-foreground">{t("Выберите задачу для новой игры. Запуск заменит текущую обстановку.")}</p>
      </header>
      <div className="min-h-0 flex-1 divide-y overflow-y-auto px-4">
        {SCENARIOS.map((scenario) => <section key={scenario.id} className="space-y-3 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{t(scenario.name)}</h3>
            {game.battle.scenarioId === scenario.id && <span className="text-xs text-muted-foreground">{t("Текущий")}</span>}
          </div>
          <p className="text-sm text-muted-foreground">{t(scenario.borderPatrol?.starts ? "Три взвода в поиске, три в транспорте в Петропавле. Найдите нарушителя до его прибытия в Булаево." : scenario.borderPatrol ? "Три заставы, девять взводов. Задержите нарушителя до его прибытия в Петропавл. Снабжение отключено." : scenario.attackerSide === "blue" ? `Займите город и удерживайте его ${scenario.holdSeconds / 60} минут.` : "Удержите город до конца времени и дождитесь резервов.")}</p>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">{scenario.timeLimitSeconds / 60}{t(" игровых минут")}</span>
            <Button size="sm" variant="outline" aria-label={t(`Начать: ${scenario.name}`)} onClick={() => start(scenario.id)}>{t("Начать")}</Button>
          </div>
        </section>)}
        <section className="space-y-3 py-4">
          <h3 className="text-sm font-semibold">{t("Свободная песочница")}</h3>
          <p className="text-sm text-muted-foreground">{t("Создавайте соединения и управляйте обеими сторонами.")}</p>
          <Button variant="outline" size="sm" onClick={() => start("sandbox")}>{t("Открыть песочницу")}</Button>
        </section>
      </div>
  </aside>;
}
