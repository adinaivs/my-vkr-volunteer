# 🚀 Быстрый старт

## Минимальный пример использования

### 1. Импортируйте необходимые модули

```typescript
import { getTranslations, LanguageSwitcher, type Locale } from '@/app/i18n';
```

### 2. Добавьте в компонент

```typescript
'use client';

import { useState, useEffect } from 'react';
import { getTranslations, LanguageSwitcher, type Locale } from '@/app/i18n';

export default function MyPage() {
  const [locale, setLocale] = useState<Locale>('ru');
  const [t, setT] = useState<any>({});

  useEffect(() => {
    getTranslations(locale, 'landing').then(setT);
  }, [locale]);

  return (
    <div>
      {/* Переключатель языка */}
      <LanguageSwitcher 
        currentLocale={locale} 
        onLocaleChange={setLocale} 
      />

      {/* Используйте переводы */}
      <h1>{t.hero?.title}</h1>
      <p>{t.hero?.subtitle}</p>
    </div>
  );
}
```

### 3. Готово! 🎉

Теперь ваше приложение поддерживает русский и кыргызский языки.

## Структура JSON перевода

```json
{
  "hero": {
    "title": "Заголовок",
    "subtitle": "Подзаголовок"
  }
}
```

## Доступ к переводам

```typescript
// Простой доступ
t.hero?.title

// Вложенный доступ
t.features?.items?.projectSearch?.title

// С fallback
t.hero?.title || 'Дефолтное значение'
```

## Добавление новой страницы

1. Создайте `app/i18n/locales/ru/mypage.json`
2. Создайте `app/i18n/locales/kg/mypage.json`
3. Используйте: `getTranslations(locale, 'mypage')`

## Полная документация

- 📖 [README.md](./README.md) - Полная документация
- 💡 [INTEGRATION_EXAMPLE.md](./INTEGRATION_EXAMPLE.md) - Детальный пример
- 📋 [SUMMARY.md](./SUMMARY.md) - Сводка по реализации

## Поддерживаемые языки

- 🇷🇺 Русский (`ru`) - по умолчанию
- 🇰🇬 Кыргызский (`kg`)

## Компоненты

- `LanguageSwitcher` - Готовый переключатель языка
- `getTranslations()` - Загрузка переводов
- `getNestedTranslation()` - Доступ к вложенным переводам

## Типы

```typescript
import type { Locale, LandingTranslations } from '@/app/i18n';
```

---

**Совет:** Всегда используйте optional chaining (`?.`) и fallback значения (`||`) для безопасного доступа к переводам!
