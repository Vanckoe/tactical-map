"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { SymbolStandard } from "@/lib/symbology";

const storageKey = "dala:symbol-standard:v1";
let current: SymbolStandard = "nato";
let initialized = false;
const listeners = new Set<() => void>();
function snapshot() {
  if (!initialized) {
    try { current = localStorage.getItem(storageKey) === "kz" ? "kz" : "nato"; } catch { /* Memory-only mode. */ }
    initialized = true;
  }
  return current;
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== storageKey && event.key !== null) return;
    initialized = false;
    listeners.forEach((notify) => notify());
  };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(listener); window.removeEventListener("storage", onStorage); };
}
function setStandard(value: SymbolStandard) {
  current = value;
  initialized = true;
  try { localStorage.setItem(storageKey, value); } catch { /* Keep the switch usable without storage. */ }
  listeners.forEach((notify) => notify());
}
const SymbolContext = createContext({ standard: "nato" as SymbolStandard, setStandard });
export function SymbolProvider({ children }: { children: ReactNode }) {
  const standard = useSyncExternalStore(subscribe, snapshot, () => "nato" as const);
  return <SymbolContext.Provider value={{ standard, setStandard }}>{children}</SymbolContext.Provider>;
}
export const useSymbolStandard = () => useContext(SymbolContext);
