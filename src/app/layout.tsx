import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { InstallPwaBanner } from "@/components/InstallPwaBanner";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "pmFit - ポップンミュージック消費カロリー＆食べ物換算トラッカー",
  description: "ポップンミュージックのリザルト画面から消費カロリーとラーメン・おにぎりなどの食べ物換算を自動算出・記録する完全オフライン対応PWA",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className="dark h-full antialiased">
      <body className={`${plusJakartaSans.className} bg-[#0d0f17] text-gray-100 min-h-screen flex flex-col`}>
        <Navbar />
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <InstallPwaBanner />
        <footer className="py-6 border-t border-white/10 text-center text-xs text-gray-500">
          <p>© {new Date().getFullYear()} pmFit - Off-line PWA Pop'n Calorie Tracker</p>
        </footer>
      </body>
    </html>
  );
}
