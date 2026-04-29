export const i18nConfig = {
  locales: ['ru', 'kg'],
  defaultLocale: 'ru',
} as const;

export type Locale = (typeof i18nConfig.locales)[number];
