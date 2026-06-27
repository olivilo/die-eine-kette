import type { Metadata, Viewport } from "next";
import "./globals.css";
import I18nProvider from "@/components/I18nProvider";
import { AuthProvider } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Die Eine Kette",
  description: "Mandantenfähiges LLM-Gateway mit Kostenkontrolle, voller Mehrsprachigkeit und Governance.",
  icons: { icon: "/brand/mark.svg" },
};

export const viewport: Viewport = {
  themeColor: "#15171E",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <I18nProvider>
          <AuthProvider>
            <Navbar />
            <main className="mx-auto max-w-6xl px-4">{children}</main>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
