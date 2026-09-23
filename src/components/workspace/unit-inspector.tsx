"use client";
import { useI18n } from "@/components/i18n/language-provider";

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
import { UnitStats } from "@/components/workspace/unit-stats";
import { UNIT_PROFILES, echelonLabel } from "@/lib/unit-balance";
import { Sandbox } from "@/hooks/use-sandbox";
export function UnitInspector({
  game,
  onFocus,
}: {
  game: Sandbox;
  onFocus: () => void;
}) {
  const { t } = useI18n();
  const u = game.unit;
  if (!u) return null;
  function move(attack = false) {
    game.setAttackCommand(attack);
    game.setCommand(true);
    game.setPlacing(false);
    if (attack)
      game.setToast("Сближение до контакта: часть остановится при обнаружении доступной цели.");
  }
  return (
    <section
      className="unit-inspector floating-surface"
      aria-label={t("Выбранное соединение")}
    >
      <div className="flex items-start gap-3 p-4">
        <UnitSymbol kind={u.kind} side={u.side} echelon={u.echelon} />
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[10px] text-muted-foreground">
            {t(u.side === "blue" ? "Свои войска" : "Противник")} · {t(echelonLabel(u.kind, u.echelon))}
          </p>
          <h2 className="truncate text-sm font-semibold">{t(u.name)}</h2>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={t("Закрыть инспектор")}
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
          {t(u.order)}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={t("Действия с соединением")}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onFocus}>
              <LocateFixed />{t("Показать на карте")}</DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              disabled={(game.botEnabled && u.side === "red") || !!game.battle.winner}
              onSelect={game.removeSelectedUnit}
            >
              <Trash2 />{t("Удалить соединение")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="grid grid-cols-3 gap-1.5 border-y p-3">
        <Button
          disabled={u.hp <= 0 || (game.botEnabled && u.side === "red") || !!game.battle.winner}
          variant={game.command ? "secondary" : "outline"}
          className="h-14 flex-col gap-1 text-[11px]"
          onClick={() => move()}
        >
          <MoveUpRight />{t("Движение")}</Button>
        <Button
          disabled={u.hp <= 0 || (game.botEnabled && u.side === "red") || !!game.battle.winner}
          variant="outline"
          className="h-14 flex-col gap-1 text-[11px]"
          onClick={() => {
            game.setUnits((us) =>
              us.map((v) =>
                v.id === u.id
                  ? { ...v, target: undefined, route: undefined, advance: false, order: "Удержание" }
                  : v,
              ),
            );
            game.setCommand(false);
            game.log(`${u.name}: удерживать позицию`);
          }}
        >
          <Shield />{t("Удерживать")}</Button>
        <Button
          disabled={u.hp <= 0 || UNIT_PROFILES[u.kind].damagePerSecond === 0 || (game.botEnabled && u.side === "red") || !!game.battle.winner}
          variant="outline"
          className="h-14 flex-col gap-1 text-[11px]"
          onClick={() => move(true)}
        >
          <Target />{t("Атака")}</Button>
      </div>
      <div className="space-y-3 p-4">
        {[
          { label: "Боеспособность", value: u.hp },
          { label: "Снабжение", value: u.supply },
        ].map((s) => (
          <div key={s.label}>
            <div className="mb-1.5 flex justify-between text-[11px]">
              <span className="text-muted-foreground">{t(s.label)}</span>
              <span className="tabular-nums">{Math.round(s.value)}%</span>
            </div>
            <Progress value={s.value} className="h-1" />
          </div>
        ))}
      </div>
      <Accordion type="single" collapsible className="border-t px-4">
        <AccordionItem value="stats">
          <AccordionTrigger className="py-3 text-xs font-normal">{t("Боевые характеристики")}</AccordionTrigger>
          <AccordionContent>
            <UnitStats kind={u.kind} echelon={u.echelon} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="details" className="border-0">
          <AccordionTrigger className="py-3 text-xs font-normal text-muted-foreground">{t("Подробнее о соединении")}</AccordionTrigger>
          <AccordionContent className="space-y-2 text-xs text-muted-foreground">
            <p>
              {t(u.lat.toFixed(4))}° N · {t(u.lng.toFixed(4))}° E
            </p>
            <p>{t("Подавление: ")}{Math.round(u.suppression ?? 0)}%</p>
            <p>{t("Укрепление позиции: ")}{Math.round((u.entrenchment ?? 0) * 100)}%</p>
            <p>{t("Обратимые потери: ")}{t((u.recoverableHp ?? 0).toFixed(1))}%</p>
            <p>{t("На позиции: ")}{Math.floor(u.stationarySeconds ?? 0)}{t(" с")}</p>
            <p>
              {t(u.target
                ? "Приказ принят. Маршрут отображён на карте."
                : "Удерживает текущую позицию.")}
            </p>
            <Button size="sm" variant="outline" onClick={onFocus}>
              <LocateFixed />{t("Показать на карте")}</Button>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}
