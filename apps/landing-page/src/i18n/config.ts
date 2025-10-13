export const languages = {
   en: "English",
   pt: "Português",
};

export const defaultLang = "en";

export const supportedLanguages = Object.keys(
   languages,
) as (keyof typeof languages)[];

export type SupportedLanguage = keyof typeof languages;
