"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, Search, PanelLeftClose, ListTree, Radio, BookOpen } from "lucide-react";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BattleStatus } from "./battle-status";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import UnitSymbol from "@/components/unit-symbol";
import { echelonLabel } from "@/lib/unit-balance";
import { Sandbox } from "@/hooks/use-sandbox";
export function ForcesSidebar({
  game,
  onCreate,
  onJournal,
  onSelect,
}: {
  game: Sandbox;
  onCreate: () => void;
  onJournal: () => void;
  onSelect: (id: string) => void;
}) {
  const [view, setView] = useState("forces");
  const activeView = game.scenario ? view : "forces";
  const [query, setQuery] = useState("");
  const { toggleSidebar, setOpenMobile } = useSidebar();
  const units = game.units.filter(
    (u) =>
      u.side === game.side &&
      u.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Sidebar variant="floating" className="forces-sidebar">
      <Tabs value={activeView} onValueChange={setView} className="flex min-h-0 flex-1 flex-col gap-0">
      <SidebarHeader className="gap-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-sm font-semibold">
            <ListTree className="size-4" />
            {activeView === "forces" ? <>Соединения<Badge variant="secondary">{game.units.length}</Badge></> : "Сценарий"}
          </h1>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleSidebar}
            aria-label="Скрыть боковую панель"
          >
            <PanelLeftClose />
          </Button>
        </div>
        {game.scenario && <TabsList className="w-full" aria-label="Раздел боковой панели">
          <TabsTrigger value="forces" className="flex-1">Соединения</TabsTrigger>
          <TabsTrigger value="scenario" className="flex-1">Сценарий{game.battle.winner && <span className="text-[10px]"> · Итог</span>}</TabsTrigger>
        </TabsList>}
      </SidebarHeader>
      <TabsContent value="forces" className="mt-0 flex min-h-0 flex-1 flex-col">
        <div className="space-y-4 px-4 pb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            aria-label="Поиск соединений"
            placeholder="Найти соединение…"
            className="pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Tabs
          value={game.side}
          onValueChange={(s) => game.setSide(s as "blue" | "red")}
        >
          <TabsList className="w-full">
            <TabsTrigger value="blue" className="flex-1">
              Свои{" "}
              <span className="text-muted-foreground">
                {game.units.filter((u) => u.side === "blue").length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="red" className="flex-1">
              Противник{" "}
              <span className="text-muted-foreground">
                {game.units.filter((u) => u.side === "red").length}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        </div>
      <SidebarContent>
        <SidebarGroup className="px-2 pt-0">
          <p className="px-2 pb-3 text-xs text-muted-foreground">
            {game.side === "blue"
              ? game.scenario?.name ?? "Группировка «Жетысу»"
              : "Условный противник"}
          </p>
          <SidebarMenu>
            {units.map((u) => (
              <SidebarMenuItem key={u.id}>
                <SidebarMenuButton
                  className="h-auto min-h-16 gap-3 py-2"
                  isActive={game.selected === u.id}
                  onClick={() => {
                    onSelect(u.id);
                    setOpenMobile(false);
                  }}
                >
                  <UnitSymbol kind={u.kind} side={u.side} echelon={u.echelon} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium">
                      {u.name}
                    </span>
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      {echelonLabel(u.kind, u.echelon)} · {u.order}
                    </span>
                  </span>
                  <span
                    className={`size-1.5 shrink-0 rounded-full ${u.hp > 0 ? "bg-emerald-500" : "bg-neutral-400"}`}
                  />
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
          {units.length === 0 && (
            <p className="px-2 py-8 text-center text-xs text-muted-foreground">
              Соединений не найдено
            </p>
          )}
        </SidebarGroup>
      </SidebarContent>
      </TabsContent>
      <TabsContent value="scenario" className="mt-0 min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <p className="mb-4 text-xs text-muted-foreground">{game.scenario?.name}</p>
        <BattleStatus game={game} />
      </TabsContent>
      <SidebarFooter className="gap-2 border-t p-3">
        {activeView === "forces" && <Button
          disabled={!!game.scenario}
          title={game.scenario ? "Состав сил задан сценарием. Создавайте части в свободной песочнице." : undefined}
          onClick={() => {
            setOpenMobile(false);
            onCreate();
          }}
        >
          <Plus />
          Добавить соединение
        </Button>}
        <Button
          variant="ghost"
          className="justify-start text-muted-foreground"
          onClick={() => {
            setOpenMobile(false);
            onJournal();
          }}
        >
          <Radio />
          Журнал событий
          <Badge variant="secondary" className="ml-auto">
            {game.logs.length}
          </Badge>
        </Button>
        <Button asChild variant="ghost" className="justify-start text-muted-foreground">
          <Link href="/symbols" target="_blank" rel="noopener noreferrer"><BookOpen />Справочник обозначений ↗</Link>
        </Button>
      </SidebarFooter>
      </Tabs>
    </Sidebar>
  );
}
