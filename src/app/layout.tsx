import type { Metadata } from "next";
import { LanguageProvider } from "@/components/i18n/language-provider";
import { getLocale } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n/translate";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SymbolProvider } from "@/components/symbology/symbol-provider";

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
  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><LanguageProvider initialLocale={locale}><SymbolProvider>{children}</SymbolProvider></LanguageProvider></body>
    </html>
  );
}
