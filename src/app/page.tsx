"use client";
import { useI18n } from "@/components/i18n/language-provider";

import dynamic from "next/dynamic";
import { LanguageSwitch } from "@/components/i18n/language-switch";
import { ScenarioPicker } from "@/components/workspace/scenario-picker";
import { StandardSwitch } from "@/components/symbology/standard-switch";
import { useRef, useState, type CSSProperties } from "react";
import {
  PanelLeft,
  Plus,
  Minus,
  Play,
  Pause,
  ChevronDown,
  MapPin,
  Crosshair,
  X,
  Check,
  LocateFixed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useSandbox, regions } from "@/hooks/use-sandbox";
import { ForcesSidebar } from "@/components/workspace/forces-sidebar";
import { ScenarioMenu, LayerMenu } from "@/components/workspace/scenario-menu";
import { UnitInspector } from "@/components/workspace/unit-inspector";
import { WorkspacePanels } from "@/components/workspace/workspace-panels";
const TacticalMap = dynamic(() => import("@/components/tactical-map"), {
  ssr: false,
  loading: LoadingMap,
});
export default function Home() {
  return (
    <TooltipProvider>
      <SidebarProvider
        defaultOpen
        className="sandbox-shell"
        style={{ "--sidebar-width": "296px" } as CSSProperties}
      >
        <Workspace />
      </SidebarProvider>
    </TooltipProvider>
  );
}
function Workspace() {
  const { t } = useI18n();
  const game = useSandbox();
  const [panel, setPanel] = useState("");
  const [scenarioPickerOpen, setScenarioPickerOpen] = useState(false);
  const scenarioTrigger = useRef<HTMLButtonElement>(null);
  const { focus, setFocus } = game;
  const { toggleSidebar, open, openMobile, isMobile } = useSidebar();
  function selectUnit(id: string) {
    setScenarioPickerOpen(false);
    game.setSelected(id);
    game.setCommand(false);
    game.setPlacing(false);
  }
  return (
    <main
      className={`map-workspace ${game.command || game.placing ? "choosing-point" : ""}`}
    >
      <TacticalMap
        scenario={game.scenario}
        points={game.battle.points}
        releasedReserves={game.battle.releasedReserves}
        units={game.visibleUnits}
        selected={game.selected}
        onSelect={selectUnit}
        onMapClick={game.onMapClick}
        placing={game.placing}
        grid={game.grid}
        routes={game.routes}
        focus={focus}
        zoomAction={game.zoom}
        enemies={game.enemies}
      />
      <header className="workspace-header">
        <div className="workspace-brand floating-surface">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label={t("Открыть или скрыть соединения")}
                aria-expanded={isMobile ? openMobile : open}
                onClick={toggleSidebar}
              >
                <PanelLeft />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("Соединения · Ctrl/⌘ B")}</TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="h-5!" />
          <span className="dala-wordmark">DALA</span>
          <Separator orientation="vertical" className="brand-divider h-5!" />
          <ScenarioMenu game={game} triggerRef={scenarioTrigger} onJournal={() => setPanel("journal")} onChooseScenario={() => {
            game.setSelected("");
            game.setCommand(false);
            game.setPlacing(false);
            setPanel("");
            setScenarioPickerOpen(true);
          }} />
        </div>
        <div className="workspace-map-controls">
          <LanguageSwitch />
          <StandardSwitch />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="region-control map-control h-10"
                aria-label={t(`Район операции: ${game.region}`)}
              >
                <MapPin />
                <span>{t(game.region)}</span>
                <ChevronDown className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t("Перейти к району")}</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={game.region}
                onValueChange={(r) => {
                  game.setRegion(r);
                  setFocus([...regions[r]]);
                }}
              >
                {Object.keys(regions).map((r) => (
                  <DropdownMenuRadioItem key={r} value={r}>
                    {t(r)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <LayerMenu game={game} />
        </div>
      </header>
      <ForcesSidebar
        game={game}
        onCreate={() => setPanel("create")}
        onJournal={() => setPanel("journal")}
        onSelect={(id) => {
          selectUnit(id);
          const u = game.visibleUnits.find((v) => v.id === id);
          if (u) setFocus([u.lat, u.lng]);
        }}
      />
      {scenarioPickerOpen ? <ScenarioPicker game={game} onClose={() => { setScenarioPickerOpen(false); scenarioTrigger.current?.focus(); }} /> : game.unit && !game.command && !game.placing && (
        <UnitInspector
          game={game}
          onFocus={() => {
            if (game.unit) setFocus([game.unit.lat, game.unit.lng]);
          }}
        />
      )}
      {(game.placing || game.command) && (
        <div className="point-instruction floating-surface" role="status">
          <Crosshair className="size-4 shrink-0" />
          <span>
            {t(game.placing
              ? "Выберите точку размещения. Удерживайте Shift, чтобы добавить несколько соединений."
              : "Укажите точку назначения")}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("Отменить выбор точки")}
            onClick={() => {
              game.setPlacing(false);
              game.setCommand(false);
            }}
          >
            <X />
          </Button>
        </div>
      )}
      <div className="map-navigation floating-surface">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-lg"
              variant="ghost"
              aria-label={t("К району операции")}
              onClick={() => setFocus(game.scenario?.center ?? [...regions[game.region]])}
            >
              <LocateFixed />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">{t("К району операции")}</TooltipContent>
        </Tooltip>
        <Separator />
        <Button
          size="icon-lg"
          variant="ghost"
          aria-label={t("Приблизить")}
          onClick={() => game.setZoom((z) => z + 1)}
        >
          <Plus />
        </Button>
        <Button
          size="icon-lg"
          variant="ghost"
          aria-label={t("Отдалить")}
          onClick={() => game.setZoom((z) => z - 1)}
        >
          <Minus />
        </Button>
      </div>
      <div className="playback floating-surface">
        <Button
          className="size-10 rounded-lg"
          size="icon-lg"
          aria-label={t(game.running ? "Приостановить" : "Запустить")}
          onClick={() => game.setRunning(!game.running)}
        >
          {game.running ? <Pause /> : <Play fill="currentColor" />}
        </Button>
        <div className="playback-time">
          <span className="block text-[10px] text-muted-foreground">
            {t(game.running ? "Симуляция идёт" : "На паузе")}
          </span>
          <span className="font-mono text-base tabular-nums">{t(game.time)}</span>
        </div>
        <Separator orientation="vertical" className="h-7!" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="min-w-16 text-xs"
              aria-label={t("Скорость симуляции")}
            >
              {game.speed}×<ChevronDown className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end">
            <DropdownMenuLabel>{t("Скорость времени")}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={String(game.speed)}
              onValueChange={(v) => game.setSpeed(Number(v))}
            >
              {[1, 2, 5, 10, 20, 25, 50, 75, 100].map((s) => (
                <DropdownMenuRadioItem key={s} value={String(s)}>
                  {s}×{" "}
                  {t(s === 1 ? "" : s === 2 ? "" : "")}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="map-caption">
        <span className="size-1.5 rounded-full bg-emerald-600" />
        {t(game.scenario ? "Учебная местность" : "Песочница")}<span className="text-neutral-400">/</span>{t("Условная обстановка")}</div>
      {game.toast && (
        <div className="workspace-toast floating-surface" role="status">
          <Check className="size-4 shrink-0" />
          {t(game.toast)}
        </div>
      )}
      <WorkspacePanels game={game} panel={panel} setPanel={setPanel} />
    </main>
  );
}

function LoadingMap() {
  const { t } = useI18n(); return <div className="map-loading">{t("Загрузка карты…")}</div>; }
