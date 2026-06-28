import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import de from "./locales/de.json";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import es from "./locales/es.json";
import it from "./locales/it.json";
import sr from "./locales/sr.json";
import hr from "./locales/hr.json";
import bs from "./locales/bs.json";
import sl from "./locales/sl.json";
import mk from "./locales/mk.json";
import sq from "./locales/sq.json";
import zh from "./locales/zh.json";

export const languages = [
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
  { code: "sr", label: "Српски" },
  { code: "hr", label: "Hrvatski" },
  { code: "bs", label: "Bosanski" },
  { code: "sl", label: "Slovenščina" },
  { code: "mk", label: "Македонски" },
  { code: "sq", label: "Shqip" },
  { code: "zh", label: "中文" },
] as const;

export type LanguageCode = (typeof languages)[number]["code"];
export const defaultLng: LanguageCode = "de";
export const STORAGE_KEY = "dek.lng";

// RTL-Vorbereitung: Sprachen mit Rechts-nach-links-Schreibrichtung (z. B. ar/he/fa später).
const RTL = new Set(["ar", "he", "fa", "ur"]);
export function isRtl(lng?: string): boolean {
  return !!lng && RTL.has(lng.split("-")[0]);
}
export function applyDir(lng?: string) {
  if (typeof document !== "undefined") {
    document.documentElement.dir = isRtl(lng) ? "rtl" : "ltr";
    if (lng) document.documentElement.lang = lng;
  }
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      de: { translation: de },
      en: { translation: en },
      fr: { translation: fr },
      es: { translation: es },
      it: { translation: it },
      sr: { translation: sr },
      hr: { translation: hr },
      bs: { translation: bs },
      sl: { translation: sl },
      mk: { translation: mk },
      sq: { translation: sq },
      zh: { translation: zh },
    },
    // Deterministisch fürs SSR — Client wechselt nach Mount via LanguageSwitcher.
    lng: defaultLng,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
}

export default i18n;
