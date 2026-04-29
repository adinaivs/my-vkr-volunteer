import { Locale, i18nConfig } from './config';

const LOCALE_COOKIE_NAME = 'locale';

export function getLocaleFromCookie(): Locale {
  if (typeof document === 'undefined') {
    return i18nConfig.defaultLocale;
  }

  const cookies = document.cookie.split(';');
  const localeCookie = cookies.find(cookie => 
    cookie.trim().startsWith(`${LOCALE_COOKIE_NAME}=`)
  );

  if (localeCookie) {
    const locale = localeCookie.split('=')[1].trim() as Locale;
    if (i18nConfig.locales.includes(locale)) {
      return locale;
    }
  }

  return i18nConfig.defaultLocale;
}

export function setLocaleToCookie(locale: Locale): void {
  if (typeof document === 'undefined') return;

  const maxAge = 365 * 24 * 60 * 60; // 1 год
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=${maxAge}; SameSite=Lax`;
}
