import { describe, test, expect } from "bun:test";
import { symbolSvg, affiliationColor } from "../src/lib/symbology.ts";
import { symbolCatalog, symbolGroups } from "../src/lib/symbol-catalog.ts";
import { KIND_IDS, ECHELONS } from "../src/lib/unit-balance.ts";

const kinds = [...KIND_IDS];
describe("symbol standards", () => {
  test("all playable combinations produce SVGs and standards/affiliations differ", () => {
    for (const kind of kinds) for (const echelon of ECHELONS) {
      const variants = ["nato", "kz"].flatMap((standard) => ["blue", "red"].map((side) => symbolSvg(kind, side, standard, echelon)));
      for (const svg of variants) {
        expect(svg).toStartWith("<svg");
        expect(svg).not.toMatch(/undefined|NaN/);
        expect(svg).toEndWith("</svg>");
      }
      expect(new Set(variants).size).toBe(4);
    }
  });
  test("ground echelons are not hardcoded to battalion", () => {
    expect(symbolSvg("infantry", "blue", "nato", "Рота")).not.toBe(symbolSvg("infantry", "blue", "nato", "Батальон"));
    expect(symbolSvg("infantry", "blue", "kz", "Рота")).not.toBe(symbolSvg("infantry", "blue", "kz", "Батальон"));
  });
  test("source convention reverses sides and keeps special troops black", () => {
    expect(affiliationColor("kz", "blue", "infantry")).toBe("#bc3434");
    expect(affiliationColor("kz", "blue", "artillery")).toBe("#242424");
    expect(affiliationColor("kz", "red", "artillery")).toBe("#245cb5");
  });
  test("catalog has unique identities, known categories and all playable kinds", () => {
    expect(new Set(symbolCatalog.map((entry) => entry.id)).size).toBe(symbolCatalog.length);
    expect(symbolCatalog.filter((entry) => entry.kind).map((entry) => entry.kind).sort()).toEqual(kinds.toSorted());
    for (const entry of symbolCatalog) expect(symbolGroups.some((group) => group.id === entry.category)).toBe(true);
  });
});
