'use client';

import { useState, useEffect } from 'react';
import { Locale } from './config';
import { getTranslations } from './utils';
import { getLocaleFromCookie } from './cookies';

export function useTranslation(page: string) {
  const [locale, setLocale] = useState<Locale>('ru');
  const [t, setT] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  // Загрузить язык из cookie при монтировании
  useEffect(() => {
    const savedLocale = getLocaleFromCookie();
    setLocale(savedLocale);
  }, []);

  // Загрузить переводы при изменении языка
  useEffect(() => {
    setIsLoading(true);
    getTranslations(locale, page)
      .then(setT)
      .finally(() => setIsLoading(false));
  }, [locale, page]);

  return { t, locale, setLocale, isLoading };
}
