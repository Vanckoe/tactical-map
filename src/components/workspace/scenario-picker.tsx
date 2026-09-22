"use client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { SCENARIOS } from "@/lib/scenarios";
import type { Sandbox } from "@/hooks/use-sandbox";

export function ScenarioPicker({ game, open, onOpenChange, onCloseFocus }: {
  game: Sandbox;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseFocus: () => void;
}) {
  const start = (id: string) => {
    game.selectScenario(id);
    onOpenChange(false);
  };
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent className="overflow-y-auto" onCloseAutoFocus={(event) => { event.preventDefault(); onCloseFocus(); }}>
      <SheetHeader>
        <SheetTitle>Сыграть против бота</SheetTitle>
        <SheetDescription>Выберите задачу для новой игры. Запуск заменит текущую обстановку.</SheetDescription>
      </SheetHeader>
      <div className="divide-y px-4">
        {SCENARIOS.map((scenario) => <section key={scenario.id} className="space-y-3 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{scenario.name}</h3>
            {game.battle.scenarioId === scenario.id && <span className="text-xs text-muted-foreground">Текущий</span>}
          </div>
          <p className="text-sm text-muted-foreground">{scenario.attackerSide === "blue" ? `Займите город и удерживайте его ${scenario.holdSeconds / 60} минут.` : "Удержите город до конца времени и дождитесь резервов."}</p>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">{scenario.timeLimitSeconds / 60} игровых минут</span>
            <Button size="sm" variant="outline" aria-label={`Начать: ${scenario.name}`} onClick={() => start(scenario.id)}>Начать</Button>
          </div>
        </section>)}
        <section className="space-y-3 py-4">
          <h3 className="text-sm font-semibold">Свободная песочница</h3>
          <p className="text-sm text-muted-foreground">Создавайте соединения и управляйте обеими сторонами.</p>
          <Button variant="outline" size="sm" onClick={() => start("sandbox")}>Открыть песочницу</Button>
        </section>
      </div>
    </SheetContent>
  </Sheet>;
}
