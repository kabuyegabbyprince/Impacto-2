import { useTranslation } from "react-i18next";
import enJson from "./en.json";
import frJson from "./fr.json";
import rwJson from "./rw.json";

function flattenLocale(
  obj: Record<string, any>,
  prefix = ""
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flattenLocale(v, fullKey));
    } else if (typeof v === "string") {
      out[fullKey] = v;
    }
  }
  return out;
}

export const translations: Record<string, Record<string, string>> = {
  en: flattenLocale(enJson as Record<string, any>),
  fr: flattenLocale(frJson as Record<string, any>),
  rw: flattenLocale(rwJson as Record<string, any>),
};

function interpolateParams(
  text: string,
  params?: Record<string, string | number>
): string {
  if (!params) return text;
  let result = text;
  for (const k of Object.keys(params)) {
    const val = String(params[k]);
    result = result.split(`{{${k}}}`).join(val).split(`{${k}}`).join(val);
  }
  return result;
}

export function useLocalTranslation() {
  const { t: baseT, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage || i18n.language || "en")
    .substring(0, 2)
    .toLowerCase();
  const dict = translations[lang] || translations.en;

  return {
    t: (key: string, o?: Record<string, string | number> | string): string => {
      const hit = dict[key] ?? translations.en[key];
      if (typeof hit === "string") {
        return interpolateParams(hit, o && typeof o === "object" ? o : undefined);
      }
      if (typeof o === "string") {
        return String(baseT(key, o));
      }
      return String(baseT(key, o));
    },
    lang,
  };
}
