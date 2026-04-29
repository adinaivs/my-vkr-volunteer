import { i18nConfig, Locale } from './config';
import { LandingTranslations } from './types';

type TranslationKeys = {
  [key: string]: string | TranslationKeys;
};

export async function getTranslations(
  locale: Locale,
  page: string
): Promise<any> {
  try {
    const translations = await import(`./locales/${locale}/${page}.json`);
    return translations.default;
  } catch (error) {
    console.error(`Failed to load translations for ${locale}/${page}:`, error);
    // Fallback to default locale
    if (locale !== i18nConfig.defaultLocale) {
      return getTranslations(i18nConfig.defaultLocale, page);
    }
    return {} as TranslationKeys;
  }
}

export function getNestedTranslation(
  obj: TranslationKeys,
  path: string
): string {
  const keys = path.split('.');
  let result: any = obj;

  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      return path; // Return the path if translation not found
    }
  }

  return typeof result === 'string' ? result : path;
}
