# Локализация (i18n)

## Структура

```
app/i18n/
├── config.ts           # Конфигурация языков
├── utils.ts            # Вспомогательные функции
├── locales/
│   ├── ru/            # Русские переводы
│   │   └── landing.json
│   └── kg/            # Кыргызские переводы
│       └── landing.json
└── README.md          # Эта инструкция
```

## Поддерживаемые языки

- `ru` - Русский (по умолчанию)
- `kg` - Кыргызский

## Как использовать

### 1. Импортировать функции

```typescript
import { getTranslations, getNestedTranslation } from '@/app/i18n/utils';
import { Locale } from '@/app/i18n/config';
```

### 2. Загрузить переводы

```typescript
const locale: Locale = 'ru'; // или 'kg'
const translations = await getTranslations(locale, 'landing');
```

### 3. Получить перевод

```typescript
// Простой доступ
const title = translations.hero.title;

// Через вспомогательную функцию
const subtitle = getNestedTranslation(translations, 'hero.subtitle');
```

## Пример использования в компоненте

```typescript
'use client';

import { useState, useEffect } from 'react';
import { getTranslations } from '@/app/i18n/utils';
import { Locale } from '@/app/i18n/config';

export default function Home() {
  const [locale, setLocale] = useState<Locale>('ru');
  const [t, setT] = useState<any>({});

  useEffect(() => {
    getTranslations(locale, 'landing').then(setT);
  }, [locale]);

  return (
    <div>
      <h1>{t.hero?.title}</h1>
      <button onClick={() => setLocale(locale === 'ru' ? 'kg' : 'ru')}>
        Сменить язык
      </button>
    </div>
  );
}
```

## Добавление новой страницы

1. Создайте файл перевода для каждого языка:
   - `app/i18n/locales/ru/[page-name].json`
   - `app/i18n/locales/kg/[page-name].json`

2. Используйте в компоненте:
   ```typescript
   const translations = await getTranslations(locale, 'page-name');
   ```

## Структура JSON файлов

Используйте вложенную структуру для организации переводов:

```json
{
  "section": {
    "subsection": {
      "key": "Значение"
    }
  }
}
```

## Рекомендации

1. **Именование ключей**: Используйте camelCase для ключей
2. **Организация**: Группируйте переводы по секциям страницы
3. **Консистентность**: Сохраняйте одинаковую структуру во всех языках
4. **Fallback**: Система автоматически вернется к русскому языку, если перевод не найден
5. **Типизация**: Используйте TypeScript для безопасности типов

## Добавление нового языка

1. Добавьте код языка в `config.ts`:
   ```typescript
   export const i18nConfig = {
     locales: ['ru', 'kg', 'en'], // добавили 'en'
     defaultLocale: 'ru',
   } as const;
   ```

2. Создайте папку для нового языка:
   ```
   app/i18n/locales/en/
   ```

3. Добавьте файлы переводов для всех страниц
