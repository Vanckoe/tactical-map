import kk from "./kk.json";
export const locales = ["ru", "kk"] as const;
export type Locale = (typeof locales)[number];
export const isLocale = (value: unknown): value is Locale => value === "ru" || value === "kk";
export const messages: Record<string, string> = kk;
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Render legacy scenario messages in either language without changing saved game data.
const patterns = Object.entries(messages).filter(([key]) => /\{\d+\}/.test(key)).map(([key, value]) => {
  const slots = [...key.matchAll(/\{(\d+)\}/g)].map((match) => match[1]);
  const parts = key.split(/\{\d+\}/).map(escape);
  return { expression: new RegExp(`^${parts.join("(.+?)")}$`, "u"), slots, value };
});
function localize(input: string, depth = 0): string {
  if (!input || depth > 6) return input;
  const text = input.replace(/\s+/g, " ").trim();
  let translated = messages[text];
  if (translated === undefined) {
    for (const pattern of patterns) {
      const match = text.match(pattern.expression);
      if (!match) continue;
      const values = Object.fromEntries(pattern.slots.map((slot, i) => [slot, localize(match[i + 1], depth + 1)]));
      translated = pattern.value.replace(/\{(\d+)\}/g, (_, slot: string) => values[slot]);
      break;
    }
  }
  // Scenario/unit names are composed from canonical labels and immutable numeric IDs.
  if (translated === undefined) {
    const group = text.match(/^(Гарнизон|Наступление|Резерв I|Резерв II) (\d+)$/);
    if (group) translated = `${localize(group[1], depth + 1)} ${group[2]}`;
    else if (text.includes(" · ")) translated = text.split(" · ").map((part) => localize(part, depth + 1)).join(" · ");
  }
  if (translated === undefined) return input;
  return `${input.match(/^\s*/)?.[0] ?? ""}${translated}${input.match(/\s*$/)?.[0] ?? ""}`;
}
/** Only display strings are translated. IDs, form values, and simulation state stay canonical. */
export function translate<T>(value: T, locale: Locale): T {
  return (locale === "kk" && typeof value === "string" ? localize(value) : value) as T;
}
