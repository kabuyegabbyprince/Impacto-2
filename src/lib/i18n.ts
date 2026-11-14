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
    supportedLngs: ["en", "fr", "rw"],
    nonExplicitSupportedLngs: true,
    load: "languageOnly",
    fallbackLng: "en",
    nsSeparator: false,
    keySeparator: ".",
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    detection: {
      order: ["userPreference", "querystring", "localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

const syncHtmlLang = (lng?: string) => {
  if (typeof document === "undefined" || !lng) return;
  const short = lng.split("-")[0].toLowerCase();
  document.documentElement.lang = ["en", "fr", "rw"].includes(short) ? short : "en";
};

syncHtmlLang(i18n.resolvedLanguage || i18n.language);
i18n.on("languageChanged", syncHtmlLang);

export default i18n;
