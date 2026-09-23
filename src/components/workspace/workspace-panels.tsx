"use client";
import { useI18n } from "@/components/i18n/language-provider";

import { useState } from "react";
import { Plus, Radio } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UnitSymbol from "@/components/unit-symbol";
import { UNIT_PROFILES, echelonLabel, isEchelon } from "@/lib/unit-balance";
import { UnitStats } from "@/components/workspace/unit-stats";
import { SCENARIOS } from "@/lib/scenarios";
import { kinds } from "@/lib/simulation";
import { Sandbox } from "@/hooks/use-sandbox";
export function WorkspacePanels({
  game,
  panel,
  setPanel,
}: {
  game: Sandbox;
  panel: string;
  setPanel: (v: string) => void;
}) {
  const { t } = useI18n();
  const [role, setRole] = useState("all");
  return (
    <>
      <Sheet
        open={!!panel}
        onOpenChange={(open) => {
          if (!open) setPanel("");
        }}
      >
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {t(panel === "create" ? "Добавить соединение" : "Журнал событий")}
            </SheetTitle>
            <SheetDescription>
              {t(panel === "create"
                ? "Настройте соединение, затем выберите точку на карте."
                : "Приказы и изменения текущего сценария.")}
            </SheetDescription>
          </SheetHeader>
          {panel === "create" ? (
            <>
              <div className="space-y-6 px-4 py-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t("Сторона")}</p>
                  <Tabs
                    value={game.side}
                    onValueChange={(v) => game.setSide(v as "blue" | "red")}
                  >
                    <TabsList className="w-full">
                      <TabsTrigger value="blue" className="flex-1">{t("Свои войска")}</TabsTrigger>
                      <TabsTrigger disabled={game.botEnabled} value="red" className="flex-1">{t("Противник")}</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <fieldset>
                  <legend className="mb-3 text-sm font-medium">{t("Род войск")}</legend>
                  <Tabs value={role} onValueChange={setRole} className="mb-3">
                    <TabsList className="w-full">
                      <TabsTrigger value="all" className="flex-1 text-xs">{t("Все")}</TabsTrigger>
                      <TabsTrigger value="combat" className="flex-1 text-xs">{t("Боевые")}</TabsTrigger>
                      <TabsTrigger value="recon" className="flex-1 text-xs">{t("Разведка")}</TabsTrigger>
                      <TabsTrigger value="support" className="flex-1 text-xs">{t("Поддержка")}</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <div className="grid grid-cols-2 gap-2">
                    {kinds.filter((k) => role === "all" || k.role === role).map((k) => (
                      <Button
                        key={k.id}
                        variant={game.kind === k.id ? "secondary" : "outline"}
                        aria-pressed={game.kind === k.id}
                        className={`h-20 flex-col gap-1 whitespace-normal text-center text-xs ${game.kind === k.id ? "ring-1 ring-foreground" : ""}`}
                        onClick={() => {
                          game.setKind(k.id);
                          if (!k.echelons.includes(game.echelon)) game.setEchelon(k.echelons.includes("Батальон") ? "Батальон" : k.echelons[0]);
                        }}
                      >
                        <UnitSymbol kind={k.id} side={game.side} />
                        {t(k.label)}
                      </Button>
                    ))}
                  </div>
                </fieldset>
                <p className="rounded-lg bg-muted p-3 text-xs leading-relaxed" role="status">{t(UNIT_PROFILES[game.kind].label)}: {t(UNIT_PROFILES[game.kind].description)}</p>
                <div className="space-y-2">
                  <label htmlFor="echelon" className="text-sm font-medium">{t("Масштаб соединения")}</label>
                  <Select
                    value={game.echelon}
                    onValueChange={(value) => {
                      if (isEchelon(value)) game.setEchelon(value);
                    }}
                  >
                    <SelectTrigger id="echelon" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_PROFILES[game.kind].echelons.map((e) => (
                        <SelectItem key={e} value={e}>
                          {t(echelonLabel(game.kind, e))}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="border-t px-4 py-4">
                <UnitStats kind={game.kind} echelon={game.echelon} />
              </div>
              <SheetFooter>
                <Button
                  disabled={!!game.battle.winner || !!game.scenario}
                  onClick={() => {
                    setPanel("");
                    game.setPlacing(true);
                    game.setCommand(false);
                  }}
                >
                  <Plus />{t("Выбрать точку на карте")}</Button>
                <p className="text-center text-xs text-muted-foreground">{t("Esc — отменить размещение")}</p>
              </SheetFooter>
            </>
          ) : (
            <div className="space-y-5 p-4">
              {game.logs.map((log, i) => (
                <div key={`${i}-${log}`} className="flex gap-3 text-sm">
                  <Radio className="mt-1 size-3.5 shrink-0 text-muted-foreground" />
                  <p>{t(log)}</p>
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
      <Dialog
        open={!!game.modal}
        onOpenChange={(open) => {
          if (!open) game.setModal("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t(game.modal === "reset"
                ? "Сбросить сценарий?"
                : game.modal === "game"
                  ? "Учебный сценарий"
                  : "Как играть")}
            </DialogTitle>
            <DialogDescription>
              {t(game.modal === "reset"
                ? "Размещение и приказы вернутся к исходным. Сохранение в браузере останется доступным."
                : game.modal === "game"
                  ? "Свободное столкновение двух вымышленных сторон."
                  : "Создавайте обстановку, отдавайте приказы и управляйте временем.")}
            </DialogDescription>
          </DialogHeader>
          {game.modal === "reset" ? (
            <DialogFooter>
              <Button variant="outline" onClick={() => game.setModal("")}>{t("Отмена")}</Button>
              <Button variant="destructive" onClick={game.reset}>{t("Сбросить")}</Button>
            </DialogFooter>
          ) : game.modal === "game" ? (
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>{t("Разместите силы обеих сторон и задайте маршруты. При сближении бой начнётся после обнаружения допустимой цели и развёртывания.")}</p>
              <p>{t("Противник управляется ботом. Наступающие начинают примерно в 30 км от города и должны удержать его 15 минут. Оборона удерживает город до конца времени и получает резервы из тыла по расписанию. Зоны местности учебные, а не точная модель города.")}</p>
              {SCENARIOS.map((scenario) => <Button key={scenario.id} variant="outline" onClick={() => game.selectScenario(scenario.id)}>{t(scenario.name)}</Button>)}
            </div>
          ) : (
            <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>
                <strong className="text-foreground">{t("1. Разместите силы.")}</strong>{" "}{t("Откройте «Соединения» → «Добавить соединение». Выберите тип и точку на карте.")}</p>
              <p>
                <strong className="text-foreground">{t("2. Отдайте приказ.")}</strong>{" "}{t("Нажмите на знак соединения. В инспекторе выберите «Движение» или «Атака», затем укажите точку.")}</p>
              <p>
                <strong className="text-foreground">{t("3. Запустите время.")}</strong>{" "}{t("Используйте кнопку внизу или пробел, когда фокус на карте. Esc отменяет выбор точки.")}</p>
              <p>{t("Клавиатура: стрелки перемещают карту, Enter выбирает её центр. Ctrl/⌘ + B открывает список войск.")}</p>
              <p className="rounded-lg bg-muted p-3 text-xs">{t("Поддержка работает автоматически после остановки в радиусе союзника. Разведка передаёт цели своей стороне. Видимость маркеров в песочнице не означает обнаружение для огня. Симуляция и военные знаки условные. Соответствие официальным обозначениям ВС Казахстана не подтверждено.")}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
