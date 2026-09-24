import type { Metadata } from "next";
import { LanguageProvider } from "@/components/i18n/language-provider";
import { getLocale } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n/translate";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SymbolProvider } from "@/components/symbology/symbol-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { cookies } from "next/headers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
  title: translate("DALA — Тактическая песочница", locale),
  description: translate("Тактическая песочница на карте Казахстана. Создавайте соединения, отдавайте приказы и исследуйте игровые сценарии.", locale),
};
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const theme = (await cookies()).get("dala-theme")?.value === "dark" ? "dark" : "light";
  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased${theme === "dark" ? " dark" : ""}`}
    >
      <body className="min-h-full flex flex-col"><ThemeProvider initialTheme={theme}><LanguageProvider initialLocale={locale}><SymbolProvider>{children}</SymbolProvider></LanguageProvider></ThemeProvider></body>
    </html>
  );
}
