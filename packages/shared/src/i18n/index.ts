import { en } from "./en.js";

export type { TranslationKeys } from "./en.js";
export { en };

export type SupportedLocale = {
  code: string;
  name: string;
  nativeName: string;
  dir: "ltr" | "rtl";
};

export const SUPPORTED_LOCALES: SupportedLocale[] = [
  { code: "en", name: "English", nativeName: "English", dir: "ltr" },
  { code: "zh-CN", name: "Chinese (Simplified)", nativeName: "简体中文", dir: "ltr" },
  { code: "zh-TW", name: "Chinese (Traditional)", nativeName: "繁體中文", dir: "ltr" },
  { code: "ja", name: "Japanese", nativeName: "日本語", dir: "ltr" },
  { code: "ko", name: "Korean", nativeName: "한국어", dir: "ltr" },
  { code: "es", name: "Spanish", nativeName: "Español", dir: "ltr" },
  { code: "fr", name: "French", nativeName: "Français", dir: "ltr" },
  { code: "it", name: "Italian", nativeName: "Italiano", dir: "ltr" },
  { code: "pt-BR", name: "Portuguese (Brazil)", nativeName: "Português (Brasil)", dir: "ltr" },
  { code: "de", name: "German", nativeName: "Deutsch", dir: "ltr" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", dir: "ltr" },
  { code: "sv", name: "Swedish", nativeName: "Svenska", dir: "ltr" },
  { code: "ru", name: "Russian", nativeName: "Русский", dir: "ltr" },
  { code: "pl", name: "Polish", nativeName: "Polski", dir: "ltr" },
  { code: "uk", name: "Ukrainian", nativeName: "Українська", dir: "ltr" },
  { code: "ar", name: "Arabic", nativeName: "العربية", dir: "rtl" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", dir: "ltr" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", dir: "ltr" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", dir: "ltr" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", dir: "ltr" },
  { code: "th", name: "Thai", nativeName: "ไทย", dir: "ltr" },
];

export async function loadTranslations(locale: string): Promise<import("./en.js").TranslationKeys> {
  if (locale === "en") return en;
  try {
    const mod = await import(`./${locale}.js`);
    return mod[locale] ?? mod.default ?? en;
  } catch {
    return en;
  }
}
