import ms from "milsymbol";
import type { Echelon, Kind } from "./unit-balance";

export type SymbolStandard = "nato" | "kz";
export const STANDARD_LABELS = { nato: "НАТО", kz: "Казахстан" } as const;
export const SYMBOL_SOURCE = "http://lemur59.ru/node/427";

const codes: Record<Kind, string> = {
  recon: "G-UCR---", antitank: "G-UCAA--", engineer: "G-UCE---",
  logistics: "G-USS---", medical: "G-USM---", ew: "G-UUMSE-",
  infantry: "G-UCI---", armor: "G-UCA---", artillery: "G-UCF---",
  air: "A-MF----", drone: "A-MFQ---", airdefense: "G-UCD---",
};
const natoEchelons: Record<Echelon, string> = {
  Отделение: "B", Взвод: "D", Рота: "E", Батальон: "F", Полк: "G", Бригада: "H", Дивизия: "I",
};
export const echelonLabels: Record<Echelon, string> = {
  Отделение: "●", Взвод: "●●●", Рота: "I", Батальон: "II", Полк: "III", Бригада: "X", Дивизия: "XX",
};

// These are DALA teaching glyphs, not a verified Armed Forces of Kazakhstan standard.
const kzShapes: Record<Kind, string> = {
  recon: '<path d="M7 24L25 15L42 24L25 33Z"/><circle cx="25" cy="24" r="4"/>',
  antitank: '<path d="M8 24H38M38 24L29 17M38 24L29 31"/><rect x="12" y="19" width="10" height="10"/>',
  engineer: '<path d="M9 30H41M15 30V20H35V30M20 20V15M30 20V15"/>',
  logistics: '<path d="M10 32V20L25 13L40 20V32ZM10 20H40M25 20V32"/>',
  medical: '<path d="M20 14H30V21H37V29H30V36H20V29H13V21H20Z"/>',
  ew: '<path d="M25 34V19M18 34H32M17 18Q25 10 33 18M11 13Q25 2 39 13"/><circle cx="25" cy="21" r="3"/>',
  infantry: '<path d="M12 18H36V30H12ZM6 24H12M36 24H43M36 20L43 24L36 28"/>',
  armor: '<path d="M8 24L25 16L40 24L25 32ZM40 24H47"/>',
  artillery: '<circle cx="25" cy="27" r="5"/><path d="M25 22V12M16 16H34"/>',
  air: '<path d="M25 12V36M9 26L25 20L41 26M18 34L25 30L32 34"/>',
  drone: '<path d="M15 17L35 33M35 17L15 33"/><circle cx="13" cy="15" r="4"/><circle cx="37" cy="15" r="4"/><circle cx="13" cy="35" r="4"/><circle cx="37" cy="35" r="4"/>',
  airdefense: '<circle cx="25" cy="28" r="5"/><path d="M25 23V12M19 18L25 12L31 18M12 35H38"/>',
};
export function affiliationColor(standard: SymbolStandard, side: string, kind?: Kind) {
  if (standard === "nato") return side === "blue" ? "#16768c" : "#b73535";
  if (side !== "blue") return "#245cb5";
  return kind && ["artillery", "airdefense", "antitank", "engineer", "logistics", "medical", "ew"].includes(kind) ? "#242424" : "#bc3434";
}

const svgCache = new Map<string, string>();
export function symbolSvg(kind: Kind, side = "blue", standard: SymbolStandard = "nato", echelon?: Echelon): string {
  const key = `${kind}:${side}:${standard}:${echelon ?? ""}`;
  const cached = svgCache.get(key);
  if (cached) return cached;
  let svg: string;
  if (standard === "nato") {
    const dimension = codes[kind][0];
    // Function IDs include trailing dashes; preserve the six-character field.
    const functionId = codes[kind].slice(2);
    const isAir = dimension === "A";
    const sidc = `S${side === "blue" ? "F" : "H"}${dimension}P${functionId}-${!isAir && echelon ? natoEchelons[echelon] : "-"}---`;
    svg = new ms.Symbol(sidc, { standard: "APP6", size: 30, padding: 3 }).asSVG();
  } else {
    const color = affiliationColor(standard, side, kind);
    const label = echelon ? ({ Отделение: "", Взвод: "I", Рота: "II", Батальон: "III", Полк: "п", Бригада: "бр", Дивизия: "д" } as const)[echelon] : "";
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="42" viewBox="0 0 50 42"><text x="25" y="9" text-anchor="middle" font-family="sans-serif" font-size="10" fill="${color}">${label}</text><g fill="white" stroke="${color}" stroke-width="1.9" stroke-linejoin="round">${kzShapes[kind]}</g></svg>`;
  }
  svgCache.set(key, svg);
  return svg;
}
