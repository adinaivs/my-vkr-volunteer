'use client';

import { useState, useEffect } from 'react';
import { Locale } from './config';
import { getTranslations } from './utils';
import { getLocaleFromCookie, setLocaleToCookie } from './cookies';

export function useTranslation(page: string) {
  const [locale, setLocaleState] = useState<Locale>('ru');
  const [t, setT] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedLocale = getLocaleFromCookie();
    setLocaleState(savedLocale);
  }, []);

  // Listen for locale changes from NavLanguageSwitcher
  useEffect(() => {
    const handler = (e: Event) => {
      const newLocale = (e as CustomEvent<Locale>).detail;
      setLocaleState(newLocale);
    };
    window.addEventListener('localeChange', handler);
    return () => window.removeEventListener('localeChange', handler);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    getTranslations(locale, page)
      .then(setT)
      .finally(() => setIsLoading(false));
  }, [locale, page]);

  const setLocale = (newLocale: Locale) => {
    setLocaleToCookie(newLocale);
    setLocaleState(newLocale);
    window.dispatchEvent(new CustomEvent('localeChange', { detail: newLocale }));
  };

  return { t, locale, setLocale, isLoading };
}
