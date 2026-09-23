"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { translate, type Locale } from "@/lib/i18n/translate";
const LanguageContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void } | null>(null);
export function LanguageProvider({ children, initialLocale }: { children: React.ReactNode; initialLocale: Locale }) {
  const [locale, updateLocale] = useState(initialLocale);
  const pathname = usePathname();
  const setLocale = useCallback((next: Locale) => {
    document.cookie = `dala-locale=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    updateLocale(next);
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = translate(pathname === "/symbols" ? "Тактические обозначения — DALA" : "DALA — Тактическая песочница", locale);
  }, [locale, pathname]);
  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export function useI18n() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useI18n requires LanguageProvider");
  const { locale } = context;
  const t = useCallback(<T,>(value: T): T => translate(value, locale), [locale]);
  return { ...context, t };
}
