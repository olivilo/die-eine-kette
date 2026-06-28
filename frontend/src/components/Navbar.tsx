"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";
import { useAuth } from "./AuthProvider";

export default function Navbar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const isAdmin = (user?.role ?? 0) >= 10;
  const isRoot = (user?.role ?? 0) >= 100;
  const navKeys = [
    "dashboard", "providers", "tokens", "usage",
    ...(isRoot ? ["organizations", "budgets"] : []),
    ...(isAdmin ? ["users", "logs", "redemption"] : []),
    "settings",
  ];

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-800 bg-coal/80 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <a href="/" className="flex items-center gap-2">
          <Image src="/brand/mark.svg" alt="" width={32} height={32} priority />
          <span className="font-serif text-lg font-bold tracking-wide text-gold">
            {t("brand.name")}
          </span>
        </a>

        <ul className="ml-6 hidden gap-5 text-sm text-zinc-300 md:flex">
          {navKeys.map((k) => (
            <li key={k}>
              <a href={`/${k}`} className="hover:text-gold">
                {t(`nav.${k}`)}
              </a>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-3">
          <LanguageSwitcher />
          {user ? (
            <>
              <span className="hidden text-sm text-zinc-300 sm:inline">
                {user.display_name || user.username}
              </span>
              <button
                onClick={() => void logout()}
                className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm font-semibold text-zinc-200 hover:border-gold hover:text-gold"
              >
                {t("common.logout")}
              </button>
            </>
          ) : (
            <a
              href="/login"
              className="rounded-md bg-gold px-3 py-1.5 text-sm font-semibold text-ink hover:bg-gold-light"
            >
              {t("common.login")}
            </a>
          )}
        </div>
      </nav>
    </header>
  );
}
