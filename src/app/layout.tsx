import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "DALA — Тактическая песочница",
  description: "Тактическая песочница на карте Казахстана. Создавайте соединения, отдавайте приказы и исследуйте игровые сценарии.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><SymbolProvider>{children}</SymbolProvider></body>
    </html>
  );
}
