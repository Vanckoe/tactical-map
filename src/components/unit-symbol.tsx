"use client";
import type { Kind, Echelon } from "@/lib/unit-balance";
import { symbolSvg } from "@/lib/symbology";
import { useSymbolStandard } from "@/components/symbology/symbol-provider";
export default function UnitSymbol({ kind, side = "blue", echelon }: { kind: Kind; side?: string; echelon?: Echelon }) {
  const { standard } = useSymbolStandard();
  return <span className="unit-symbol" aria-hidden="true" dangerouslySetInnerHTML={{ __html: symbolSvg(kind, side, standard, echelon) }} />;
}
