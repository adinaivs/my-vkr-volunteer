# Использование локализации

## Быстрый старт

### 1. Импорт хука

```typescript
import { useTranslation } from '@/app/i18n';
import LanguageSwitcher from '@/app/i18n/LanguageSwitcher';
```

### 2. Использование в компоненте

```typescript
export default function MyPage() {
  const { t, locale, setLocale } = useTranslation('landing');

  return (
    <div>
      <LanguageSwitcher currentLocale={locale} onLocaleChange={setLocale} />
      <h1>{t.hero?.title || 'Заголовок по умолчанию'}</h1>
    </div>
  );
}
```

## Как это работает

1. **Cookie хранение**: Выбранный язык сохраняется в cookie с именем `locale`
2. **Автозагрузка**: При загрузке страницы язык автоматически читается из cookie
3. **Переключение**: При смене языка через `LanguageSwitcher` обновляется cookie и интерфейс

## Структура cookie

- **Имя**: `locale`
- **Значения**: `ru` или `kg` (соответствуют названиям папок в `locales/`)
- **Срок действия**: 1 год
- **Path**: `/` (доступен на всех страницах)

## Компоненты

### useTranslation(page)

Хук для работы с переводами:

```typescript
const { t, locale, setLocale, isLoading } = useTranslation('landing');
```

**Возвращает:**
- `t` - объект с переводами
- `locale` - текущий язык ('ru' | 'kg')
- `setLocale` - функция для смены языка
- `isLoading` - статус загрузки переводов

### LanguageSwitcher

Компонент переключателя языка:

```typescript
<LanguageSwitcher 
  currentLocale={locale} 
  onLocaleChange={setLocale} 
/>
```

## Доступ к переводам

```typescript
// С fallback
{t.hero?.title || 'Дефолтное значение'}

// Вложенные свойства
{t.features?.items?.projectSearch?.title}

// Массивы
{t.testimonials?.items?.map((item: any) => ...)}
```

## Файлы

- `app/i18n/cookies.ts` - Работа с cookie
- `app/i18n/useTranslation.ts` - Хук для переводов
- `app/i18n/LanguageSwitcher.tsx` - Компонент переключателя
- `app/i18n/locales/ru/` - Русские переводы
- `app/i18n/locales/kg/` - Кыргызские переводы
