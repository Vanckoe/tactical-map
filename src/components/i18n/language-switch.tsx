"use client";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "./language-provider";
export function LanguageSwitch() {
  const { locale, setLocale } = useI18n();
  const label = locale === "kk"
    ? "Интерфейс тілі: Қазақша. Орыс тіліне ауысу"
    : "Язык интерфейса: Русский. Переключить на казахский";
  return (
    <Button
      variant="outline"
      className="language-switch map-control h-10 gap-2"
      aria-label={label}
      title={label}
      onClick={() => setLocale(locale === "kk" ? "ru" : "kk")}
    >
      <Languages className="size-4" />
      <span lang={locale}>{locale === "kk" ? "ҚАЗ" : "РУС"}</span>
    </Button>
  );
}
