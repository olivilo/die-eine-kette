import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import de from "./locales/de.json";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import es from "./locales/es.json";
import it from "./locales/it.json";
import sr from "./locales/sr.json";
import zh from "./locales/zh.json";

export const languages = [
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
  { code: "sr", label: "Српски" },
  { code: "zh", label: "中文" },
] as const;

export type LanguageCode = (typeof languages)[number]["code"];
export const defaultLng: LanguageCode = "de";
export const STORAGE_KEY = "dek.lng";

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      de: { translation: de },
      en: { translation: en },
      fr: { translation: fr },
      es: { translation: es },
      it: { translation: it },
      sr: { translation: sr },
      zh: { translation: zh },
    },
    // Deterministisch fürs SSR — Client wechselt nach Mount via LanguageSwitcher.
    lng: defaultLng,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
}

export default i18n;
