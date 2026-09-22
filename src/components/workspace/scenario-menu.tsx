"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { ScenarioPicker } from "./scenario-picker";
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
}: {
  game: Sandbox;
  onJournal: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          ref={triggerRef}
          variant="ghost"
          className="scenario-trigger h-11 justify-between gap-5 px-3"
        >
          <span className="text-left">
            <span className="block text-xs font-semibold">
              {game.scenario?.name ?? "Песочница «Жетысу»"}
            </span>
            <span className="block text-[10px] font-normal text-muted-foreground">
              {game.mode === "sandbox" ? "Песочница" : "Учебный сценарий"} ·
              {game.botEnabled ? "Противник: бот" : "Ручное управление"}
            </span>
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Сценарий</DropdownMenuLabel>
        <DropdownMenuItem onSelect={game.save}>
          <Save />
          Сохранить в браузере
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={game.load}>
          <FolderOpen />
          Загрузить сохранение
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setPickerOpen(true)}>
          <Flag />Выбрать сценарий
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!game.scenario || !!game.battle.winner} onSelect={() => game.setBotEnabled(!game.botEnabled)}>
          <Flag />{game.botEnabled ? "Отключить бота" : "Включить бота"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onJournal}>
          <Radio />
          Журнал событий
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            if (document.fullscreenElement) document.exitFullscreen();
            else
              document.documentElement
                .requestFullscreen()
                .catch(() => game.setToast("Полноэкранный режим недоступен"));
          }}
        >
          <Maximize />
          Полноэкранный режим
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/symbols" target="_blank" rel="noopener noreferrer"><BookOpen />Тактические обозначения ↗</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => game.setModal("help")}>
          <BookOpen />
          Как играть
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => game.setModal("reset")}
        >
          <RotateCcw />
          Сбросить сценарий
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <ScenarioPicker game={game} open={pickerOpen} onOpenChange={setPickerOpen} onCloseFocus={() => triggerRef.current?.focus()} />
    </>
  );
}
export function LayerMenu({ game }: { game: Sandbox }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon-lg"
          className="map-control"
          aria-label="Слои карты"
        >
          <Layers />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Отображение карты</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <LayerOptions game={game} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
import { DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
function LayerOptions({ game }: { game: Sandbox }) {
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
          {item.label}
        </DropdownMenuCheckboxItem>
      ))}
    </>
  );
}
