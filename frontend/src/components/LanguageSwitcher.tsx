"use client";

import { useTranslation } from "react-i18next";
import { languages, STORAGE_KEY, applyDir } from "@/i18n/config";

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const lng = e.target.value;
    void i18n.changeLanguage(lng);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, lng);
    applyDir(lng); // setzt lang + dir (RTL/LTR)
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
      <span className="sr-only">{t("common.language")}</span>
      <select
        aria-label={t("common.language")}
        value={i18n.resolvedLanguage}
        onChange={onChange}
        className="rounded-md border border-zinc-700 bg-coal px-2 py-1 text-zinc-100 outline-none focus:border-gold"
      >
        {languages.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
