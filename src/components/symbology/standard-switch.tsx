"use client";
import { useI18n } from "@/components/i18n/language-provider";

import { ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSymbolStandard } from "./symbol-provider";
import { STANDARD_LABELS } from "@/lib/symbology";

export function StandardSwitch() {
  const { t } = useI18n();
  const { standard, setStandard } = useSymbolStandard();
  const next = standard === "nato" ? "kz" : "nato";
  return <Button variant="outline" className="standard-switch map-control h-10 bg-background" onClick={() => setStandard(next)} aria-label={t(`Обозначения: ${STANDARD_LABELS[standard]}. Переключить на ${STANDARD_LABELS[next]}`)} title={t(standard === "kz" ? "Казахстан · учебная адаптация" : "НАТО · APP-6")}>
    <ArrowLeftRight className="size-3.5" /><span>{t(STANDARD_LABELS[standard])}</span>
  </Button>;
}
