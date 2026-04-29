'use client';

import { useState } from 'react';
import { Locale, i18nConfig } from './config';
import { setLocaleToCookie } from './cookies';

interface LanguageSwitcherProps {
  currentLocale: Locale;
  onLocaleChange: (locale: Locale) => void;
}

const languageNames: Record<Locale, string> = {
  ru: 'Русский',
  kg: 'Кыргызча',
};

export default function LanguageSwitcher({
  currentLocale,
  onLocaleChange,
}: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleLocaleChange = (locale: Locale) => {
    setLocaleToCookie(locale);
    onLocaleChange(locale);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <svg
          className="w-5 h-5 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
          />
        </svg>
        <span className="text-sm font-medium text-gray-700">
          {languageNames[currentLocale]}
        </span>
        <svg
          className={`w-4 h-4 text-gray-600 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            {i18nConfig.locales.map((locale) => (
              <button
                key={locale}
                onClick={() => handleLocaleChange(locale)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                  currentLocale === locale
                    ? 'bg-emerald-50 text-[#00CC00] font-medium'
                    : 'text-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{languageNames[locale]}</span>
                  {currentLocale === locale && (
                    <svg
                      className="w-5 h-5 text-[#00CC00]"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
