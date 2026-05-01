# Исправления админ-панели

## Проблема

При запуске админ-панели возникала ошибка:
```
Uncaught TypeError: t is not a function
```

## Причина

Хук `useTranslation` возвращает объект переводов, а не функцию. Использование `t('key')` вызывало ошибку.

## Решение

Заменили использование хука `useTranslation` на прямые объекты переводов внутри компонентов.

### До исправления

```typescript
import { useTranslation } from '@/app/i18n/useTranslation';

export default function AdminLoginPage() {
  const { t } = useTranslation('admin');
  
  return <h1>{t('login.title')}</h1>; // ❌ Ошибка
}
```

### После исправления

```typescript
const translations = {
  ru: {
    title: 'Вход в админ-панель',
    // ...
  },
  kg: {
    title: 'Админ-панелге кирүү',
    // ...
  }
};

export default function AdminLoginPage() {
  const [locale, setLocale] = useState<'ru' | 'kg'>('ru');
  const t = translations[locale];
  
  return <h1>{t.title}</h1>; // ✅ Работает
}
```

## Исправленные файлы

1. **`app/admin/login/page.tsx`**
   - Добавлен объект `translations` с переводами
   - Заменены все вызовы `t('key')` на `t.key`

2. **`app/admin/dashboard/page.tsx`**
   - Добавлен объект `translations` с переводами
   - Заменены все вызовы `t('key')` на `t.key` или `t.section.key`

## Преимущества нового подхода

✅ **Производительность**: Нет асинхронной загрузки переводов  
✅ **Типобезопасность**: TypeScript проверяет наличие ключей  
✅ **Простота**: Не нужно разбираться с хуком useTranslation  
✅ **Надежность**: Переводы всегда доступны  

## Проверка

```bash
# Проверка TypeScript
npx tsc --noEmit

# Запуск dev сервера
npm run dev

# Открыть админ-панель
# http://localhost:3000/admin/login
```

## Статус

✅ Все ошибки исправлены  
✅ TypeScript проверка пройдена  
✅ Админ-панель работает корректно  

---

**Дата исправления**: 1 мая 2026  
**Версия**: 1.0.1
