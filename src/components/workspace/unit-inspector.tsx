"use client";
import {
  MoveUpRight,
  Shield,
  Target,
  X,
  MoreHorizontal,
  Trash2,
  LocateFixed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import UnitSymbol from "@/components/unit-symbol";
import { Sandbox } from "@/hooks/use-sandbox";
export function UnitInspector({
  game,
  onFocus,
}: {
  game: Sandbox;
  onFocus: () => void;
}) {
  const u = game.unit;
  if (!u) return null;
  function move(attack = false) {
    game.setCommand(true);
    game.setPlacing(false);
    if (attack)
      game.setToast("Укажите точку сближения. Бой начнётся автоматически.");
  }
  return (
    <section
      className="unit-inspector floating-surface"
      aria-label="Выбранное соединение"
    >
      <div className="flex items-start gap-3 p-4">
        <UnitSymbol kind={u.kind} side={u.side} />
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[10px] text-muted-foreground">
            {u.side === "blue" ? "Свои войска" : "Противник"} · {u.echelon}
          </p>
          <h2 className="truncate text-sm font-semibold">{u.name}</h2>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Закрыть инспектор"
          onClick={() => {
            game.setSelected("");
            game.setCommand(false);
          }}
        >
          <X />
        </Button>
      </div>
      <div className="flex items-center justify-between px-4 pb-3">
        <Badge variant="secondary" className="font-normal">
          <span
            className={`mr-1 size-1.5 rounded-full ${u.hp > 0 ? "bg-emerald-500" : "bg-red-500"}`}
          />
          {u.order}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Действия с соединением"
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onFocus}>
              <LocateFixed />
              Показать на карте
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => {
                game.setUnits((us) => us.filter((v) => v.id !== u.id));
                game.setSelected("");
                game.setCommand(false);
                game.log(`Удалено: ${u.name}`);
              }}
            >
              <Trash2 />
              Удалить соединение
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="grid grid-cols-3 gap-1.5 border-y p-3">
        <Button
          disabled={u.hp <= 0}
          variant={game.command ? "secondary" : "outline"}
          className="h-14 flex-col gap-1 text-[11px]"
          onClick={() => move()}
        >
          <MoveUpRight />
          Движение
        </Button>
        <Button
          disabled={u.hp <= 0}
          variant="outline"
          className="h-14 flex-col gap-1 text-[11px]"
          onClick={() => {
            game.setUnits((us) =>
              us.map((v) =>
                v.id === u.id
                  ? { ...v, target: undefined, order: "Удержание" }
                  : v,
              ),
            );
            game.setCommand(false);
            game.log(`${u.name}: удерживать позицию`);
          }}
        >
          <Shield />
          Удерживать
        </Button>
        <Button
          disabled={u.hp <= 0}
          variant="outline"
          className="h-14 flex-col gap-1 text-[11px]"
          onClick={() => move(true)}
        >
          <Target />
          Атака
        </Button>
      </div>
      <div className="space-y-3 p-4">
        {[
          { label: "Боеспособность", value: u.hp },
          { label: "Снабжение", value: u.supply },
        ].map((s) => (
          <div key={s.label}>
            <div className="mb-1.5 flex justify-between text-[11px]">
              <span className="text-muted-foreground">{s.label}</span>
              <span className="tabular-nums">{Math.round(s.value)}%</span>
            </div>
            <Progress value={s.value} className="h-1" />
          </div>
        ))}
      </div>
      <Accordion type="single" collapsible className="border-t px-4">
        <AccordionItem value="details" className="border-0">
          <AccordionTrigger className="py-3 text-xs font-normal text-muted-foreground">
            Подробнее о соединении
          </AccordionTrigger>
          <AccordionContent className="space-y-2 text-xs text-muted-foreground">
            <p>
              {u.lat.toFixed(4)}° N · {u.lng.toFixed(4)}° E
            </p>
            <p>Мораль: {u.hp > 60 ? "высокая" : "низкая"}</p>
            <p>
              {u.target
                ? "Приказ принят. Маршрут отображён на карте."
                : "Удерживает текущую позицию."}
            </p>
            <Button size="sm" variant="outline" onClick={onFocus}>
              <LocateFixed />
              Показать на карте
            </Button>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}
