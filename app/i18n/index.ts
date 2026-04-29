// Экспорт всех необходимых функций и типов
export { getTranslations, getNestedTranslation } from './utils';
export { i18nConfig, type Locale } from './config';
export { default as LanguageSwitcher } from './LanguageSwitcher';
export type { LandingTranslations } from './types';
export { getLocaleFromCookie, setLocaleToCookie } from './cookies';
export { useTranslation } from './useTranslation';
