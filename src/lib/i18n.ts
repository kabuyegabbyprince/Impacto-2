import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "../locales/en.json";
import fr from "../locales/fr.json";
import rw from "../locales/rw.json";

// Detect user-specific language if available in personal user session
const getUserLanguage = (): string | undefined => {
  if (typeof window === "undefined") return undefined;
  try {
    const rawUser = localStorage.getItem("impacto_user");
    if (rawUser) {
      const user = JSON.parse(rawUser);
      const userLang = localStorage.getItem("impacto_user_lang_" + user.id) || user.preferred_language;
      if (userLang) return userLang;
    }
  } catch {}
  return undefined;
};

const customDetector = new LanguageDetector();
customDetector.addDetector({
  name: "userPreference",
  lookup() {
    return getUserLanguage();
  },
  cacheUserLanguage(lng) {
    try {
      const rawUser = localStorage.getItem("impacto_user");
      if (rawUser) {
        const user = JSON.parse(rawUser);
        if (user?.id) {
          localStorage.setItem("impacto_user_lang_" + user.id, lng);
        }
      }
    } catch {}
  }
});

i18n
  .use(customDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      rw: { translation: rw },
    },
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    detection: {
      order: ["userPreference", "querystring", "localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

export default i18n;
