"use client";
import { useI18n } from "@/components/i18n/language-provider";

import Link from "next/link";
import { useRef, type Ref } from "react";
import {
  ChevronDown,
  Save,
  FolderOpen,
  RotateCcw,
  BookOpen,
  Radio,
  Flag,
  Layers,
  Maximize,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Sandbox } from "@/hooks/use-sandbox";
export function ScenarioMenu({
  game,
  onJournal,
  onChooseScenario,
  triggerRef,
}: {
  game: Sandbox;
  onJournal: () => void;
  onChooseScenario: () => void;
  triggerRef: Ref<HTMLButtonElement>;
}) {
  const { t } = useI18n();
  const openingPicker = useRef(false);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          ref={triggerRef}
          variant="ghost"
          className="scenario-trigger h-11 justify-between gap-5 px-3"
        >
          <span className="text-left">
            <span className="block text-xs font-semibold">
              {t(game.scenario?.name ?? "Песочница «Жетысу»")}
            </span>
            <span className="block text-[10px] font-normal text-muted-foreground">
              {t(game.mode === "sandbox" ? "Песочница" : "Учебный сценарий")} ·
              {t(game.botEnabled ? "Противник: бот" : "Ручное управление")}
            </span>
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64" onCloseAutoFocus={(event) => { if (openingPicker.current) { event.preventDefault(); openingPicker.current = false; } }}> 
        <DropdownMenuLabel>{t("Сценарий")}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={game.save}>
          <Save />{t("Сохранить в браузере")}</DropdownMenuItem>
        <DropdownMenuItem onSelect={game.load}>
          <FolderOpen />{t("Загрузить сохранение")}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => { openingPicker.current = true; onChooseScenario(); }}>
          <Flag />{t("Выбрать сценарий")}</DropdownMenuItem>
        <DropdownMenuItem disabled={!game.scenario || !!game.battle.winner} onSelect={() => game.setBotEnabled(!game.botEnabled)}>
          <Flag />{t(game.botEnabled ? "Отключить бота" : "Включить бота")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onJournal}>
          <Radio />{t("Журнал событий")}</DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            if (document.fullscreenElement) document.exitFullscreen();
            else
              document.documentElement
                .requestFullscreen()
                .catch(() => game.setToast("Полноэкранный режим недоступен"));
          }}
        >
          <Maximize />{t("Полноэкранный режим")}</DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/symbols" target="_blank" rel="noopener noreferrer"><BookOpen />{t("Тактические обозначения ↗")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => game.setModal("help")}>
          <BookOpen />{t("Как играть")}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => game.setModal("reset")}
        >
          <RotateCcw />{t("Сбросить сценарий")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
export function LayerMenu({ game }: { game: Sandbox }) {
  const { t } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon-lg"
          className="map-control"
          aria-label={t("Слои карты")}
        >
          <Layers />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>{t("Отображение карты")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <LayerOptions game={game} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
import { DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
function LayerOptions({ game }: { game: Sandbox }) {
  const { t } = useI18n();
  return (
    <>
      {[
        { label: "Координатная сетка", value: game.grid, set: game.setGrid },
        { label: "Маршруты приказов", value: game.routes, set: game.setRoutes },
        {
          label: "Показывать противника",
          value: game.enemies,
          set: game.setEnemies,
        },
      ].map((item) => (
        <DropdownMenuCheckboxItem
          key={item.label}
          checked={item.value}
          onCheckedChange={item.set}
          onSelect={(e) => e.preventDefault()}
        >
          {t(item.label)}
        </DropdownMenuCheckboxItem>
      ))}
    </>
  );
}
