'use client';

import { useState, useEffect } from 'react';
import { Locale, i18nConfig } from './config';
import { getLocaleFromCookie, setLocaleToCookie } from './cookies';

const LABELS: Record<Locale, string> = {
  ru: 'Русский',
  kg: 'Кыргызча',
};

const SHORT: Record<Locale, string> = {
  ru: 'RU',
  kg: 'KG',
};

export default function NavLanguageSwitcher() {
  const [locale, setLocale] = useState<Locale>('ru');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setLocale(getLocaleFromCookie());
    const handler = (e: Event) => setLocale((e as CustomEvent<Locale>).detail);
    window.addEventListener('localeChange', handler);
    return () => window.removeEventListener('localeChange', handler);
  }, []);

  const handleChange = (l: Locale) => {
    setLocaleToCookie(l);
    setLocale(l);
    window.dispatchEvent(new CustomEvent('localeChange', { detail: l }));
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm font-semibold text-gray-700"
        title="Сменить язык / Тилди өзгөртүү"
      >
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
        </svg>
        <span>{SHORT[locale]}</span>
        <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1.5 w-36 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden py-1">
            {i18nConfig.locales.map((l) => (
              <button
                key={l}
                onClick={() => handleChange(l)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                  locale === l
                    ? 'bg-green-50 text-[#00CC00] font-semibold'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-base">{l === 'ru' ? '🇷🇺' : '🇰🇬'}</span>
                <span>{LABELS[l]}</span>
                {locale === l && (
                  <svg className="w-4 h-4 text-[#00CC00] ml-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
