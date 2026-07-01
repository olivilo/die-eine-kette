"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Menu } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { api } from "@/lib/api";
import Sidebar from "./Sidebar";
import LanguageSwitcher from "./LanguageSwitcher";

const COLLAPSE_KEY = "dek.sidebar.collapsed";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [rootPwWarn, setRootPwWarn] = useState(false);

  useEffect(() => {
    setCollapsed(typeof window !== "undefined" && window.localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  // Sicherheits-Hinweis: warnen, wenn root noch das Default-Passwort nutzt (nur Admin/Root).
  // Neben dem Mount-Check horchen wir auf "dek:security-refresh", damit der Banner nach
  // einer Passwortänderung sofort neu geprüft wird (ohne vollen Reload).
  useEffect(() => {
    if (!user || (user.role ?? 0) < 10) return;
    const check = () =>
      api.securityStatus().then((r) => setRootPwWarn(!!r.data?.root_password_is_default)).catch(() => {});
    check();
    window.addEventListener("dek:security-refresh", check);
    return () => window.removeEventListener("dek:security-refresh", check);
  }, [user]);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const n = !c;
      if (typeof window !== "undefined") window.localStorage.setItem(COLLAPSE_KEY, n ? "1" : "0");
      return n;
    });
  }

  // Öffentlich (nicht eingeloggt): schlanke Top-Leiste statt Seitenleiste.
  if (!loading && !user) {
    return (
      <div className="min-h-screen">
        <header className="sticky top-0 z-10 border-b border-zinc-800 bg-coal/80 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
            <a href="/" className="flex items-center gap-2">
              <Image src="/brand/mark.svg" alt="" width={32} height={32} priority />
              <span className="whitespace-nowrap font-serif text-lg font-bold tracking-wide text-gold">Die Eine Kette</span>
            </a>
            <div className="ml-auto flex items-center gap-3">
              <LanguageSwitcher />
              <a href="/login" className="rounded-md bg-gold px-3 py-1.5 text-sm font-semibold text-ink hover:bg-gold-light">
                {t("common.login")}
              </a>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4">{children}</main>
      </div>
    );
  }

  // Eingeloggt: Seitenleiste + verschobener Inhalt.
  return (
    <div className="min-h-screen">
      <Sidebar
        collapsed={collapsed}
        onToggle={toggleCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Mobile-Topbar mit Hamburger */}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-zinc-800 bg-coal/90 px-4 backdrop-blur md:hidden">
        <button onClick={() => setMobileOpen(true)} className="text-zinc-300 hover:text-gold" aria-label={t("navgroup.menu")}>
          <Menu size={22} />
        </button>
        <Image src="/brand/mark.svg" alt="" width={26} height={26} />
        <span className="whitespace-nowrap font-serif text-base font-bold tracking-wide text-gold">Die Eine Kette</span>
      </header>

      <main className={`px-4 transition-all duration-200 ${collapsed ? "md:ml-16" : "md:ml-64"}`}>
        <div className="mx-auto max-w-6xl">
          {rootPwWarn && (
            <div className="mt-4 rounded-md border border-red-700 bg-red-950/40 px-4 py-3 text-sm text-red-200">
              ⚠️ <b>{t("security.rootpw_title", "Sicherheitswarnung")}:</b>{" "}
              {t("security.rootpw_body", "Der root-Account nutzt noch das Standard-Passwort. Bitte umgehend in den Einstellungen ändern.")}
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
