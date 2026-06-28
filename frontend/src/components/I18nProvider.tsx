"use client";

import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import i18n, { STORAGE_KEY, applyDir } from "@/i18n/config";

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  // Nach Mount gespeicherte Sprache anwenden (kein SSR-Hydration-Mismatch).
  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    const lng = saved && saved !== i18n.language ? saved : i18n.resolvedLanguage;
    if (saved && saved !== i18n.language) void i18n.changeLanguage(saved);
    applyDir(lng); // RTL/LTR-Schreibrichtung setzen
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
