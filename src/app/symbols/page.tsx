import type { Metadata } from "next";
import { SymbolCatalog } from "@/components/symbology/symbol-catalog";

export const metadata: Metadata = {
  title: "Тактические обозначения — DALA",
  description: "Справочник тактических обозначений, переключение НАТО и учебной адаптации Казахстана, каталог знаков для будущих слоёв карты.",
};
export default function SymbolsPage() { return <SymbolCatalog />; }
