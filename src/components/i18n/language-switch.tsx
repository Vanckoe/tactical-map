"use client";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { isLocale } from "@/lib/i18n/translate";
import { useI18n } from "./language-provider";
export function LanguageSwitch() {
  const { locale, setLocale } = useI18n();
  return <DropdownMenu>
    <DropdownMenuTrigger asChild><Button variant="outline" className="language-switch map-control h-10 gap-2" aria-label={locale === "kk" ? "Интерфейс тілі: Қазақша" : "Язык интерфейса: Русский"}><Languages className="size-4" /><span lang={locale}>{locale === "kk" ? "ҚАЗ" : "РУС"}</span></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end"><DropdownMenuRadioGroup value={locale} onValueChange={(value) => { if (isLocale(value)) setLocale(value); }}><DropdownMenuRadioItem value="kk" lang="kk">Қазақша</DropdownMenuRadioItem><DropdownMenuRadioItem value="ru" lang="ru">Русский</DropdownMenuRadioItem></DropdownMenuRadioGroup></DropdownMenuContent>
  </DropdownMenu>;
}
