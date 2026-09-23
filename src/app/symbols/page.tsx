import { getLocale } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n/translate";
import type { Metadata } from "next";
import { SymbolCatalog } from "@/components/symbology/symbol-catalog";

export async function generateMetadata(): Promise<Metadata> {
 const locale = await getLocale();
 return {
  title: translate("Тактические обозначения — DALA", locale),
  description: translate("Справочник тактических обозначений, переключение НАТО и учебной адаптации Казахстана, каталог знаков для будущих слоёв карты.", locale),
};
}
export default function SymbolsPage() { return <SymbolCatalog />; }
