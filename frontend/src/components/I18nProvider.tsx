"use client";

import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import i18n, { STORAGE_KEY } from "@/i18n/config";

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  // Nach Mount gespeicherte Sprache anwenden (kein SSR-Hydration-Mismatch).
  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (saved && saved !== i18n.language) {
      void i18n.changeLanguage(saved);
    }
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
