# Пример интеграции локализации

## Как интегрировать локализацию в существующую страницу

### Шаг 1: Обновить импорты

```typescript
'use client';

import { useState, useEffect } from 'react';
import React from 'react';
import { getTranslations } from '@/app/i18n/utils';
import { Locale } from '@/app/i18n/config';
import LanguageSwitcher from '@/app/i18n/LanguageSwitcher';
```

### Шаг 2: Добавить состояние для языка и переводов

```typescript
export default function Home() {
  const [activeStep, setActiveStep] = useState(0);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  
  // Добавить эти строки
  const [locale, setLocale] = useState<Locale>('ru');
  const [t, setT] = useState<any>({});

  // Загрузить переводы при изменении языка
  useEffect(() => {
    getTranslations(locale, 'landing').then(setT);
  }, [locale]);

  // ... остальной код
}
```

### Шаг 3: Заменить хардкод текстов на переводы

#### Было:
```typescript
<div className="text-2xl font-bold text-gray-900">
  Волонтёр<span className="text-[#00CC00]">КР</span>
</div>
```

#### Стало:
```typescript
<div className="text-2xl font-bold text-gray-900">
  {t.header?.logo || 'ВолонтёрКР'}
</div>
```

### Шаг 4: Добавить переключатель языка в header

```typescript
<header className="fixed top-0 w-full bg-white/80 backdrop-blur-md shadow-sm z-50">
  <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
    {/* Logo */}
    <div className="flex items-center gap-2">
      {/* ... */}
    </div>
    
    {/* Navigation */}
    <nav className="hidden md:flex items-center gap-8">
      <a href="#features">
        {t.header?.nav?.features || 'Возможности'}
      </a>
      {/* ... */}
    </nav>

    {/* Auth Button and Language Switcher */}
    <div className="flex items-center gap-4">
      <LanguageSwitcher 
        currentLocale={locale} 
        onLocaleChange={setLocale} 
      />
      <button className="px-6 py-2 bg-[#00CC00] text-white rounded-full font-medium hover:bg-[#00b300] transition-colors">
        {t.header?.authButton || 'Войти'}
      </button>
    </div>
  </div>
</header>
```

### Шаг 5: Обновить динамические данные

#### Для массивов (steps, testimonials):

```typescript
// Вместо хардкода в компоненте
const steps = [
  {
    num: '1',
    title: 'Регистрация',
    // ...
  },
  // ...
];

// Использовать переводы
const steps = t.howItWorks?.steps ? [
  {
    num: '1',
    title: t.howItWorks.steps.registration.title,
    desc: t.howItWorks.steps.registration.description,
    details: t.howItWorks.steps.registration.details,
    icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z'
  },
  {
    num: '2',
    title: t.howItWorks.steps.projectSelection.title,
    desc: t.howItWorks.steps.projectSelection.description,
    details: t.howItWorks.steps.projectSelection.details,
    icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
  },
  // ...
] : [];
```

### Шаг 6: Обработать отзывы

```typescript
const testimonials = t.testimonials?.items || [];
```

### Полный пример секции Hero:

```typescript
<section className="pt-32 pb-20 px-6 relative overflow-hidden">
  <div className="max-w-5xl mx-auto text-center relative z-10">
    <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
      {t.hero?.title || 'Стань частью перемен и меняй мир'}{' '}
      <span className="text-[#00CC00]">
        {t.hero?.titleHighlight || 'к лучшему вместе с нами'}
      </span>
    </h1>
    <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
      {t.hero?.subtitle || 'Платформа для волонтёров и организаторов социальных проектов в Кыргызстане'}
    </p>
    <div className="flex gap-4 justify-center">
      <button className="px-8 py-4 bg-[#00CC00] text-white rounded-full font-bold hover:bg-[#00b300] transition-colors shadow-lg">
        {t.hero?.findProjectButton || 'Найти проект'}
      </button>
      <button className="px-8 py-4 bg-white text-[#00CC00] border-2 border-[#00CC00] rounded-full font-bold hover:bg-emerald-50 transition-colors">
        {t.hero?.createProjectButton || 'Создать проект'}
      </button>
    </div>
  </div>
</section>
```

## Важные моменты

1. **Fallback значения**: Всегда используйте оператор `||` с дефолтным значением на случай, если переводы еще не загружены:
   ```typescript
   {t.header?.logo || 'ВолонтёрКР'}
   ```

2. **Optional chaining**: Используйте `?.` для безопасного доступа к вложенным свойствам:
   ```typescript
   {t.hero?.subtitle}
   ```

3. **Проверка массивов**: Перед использованием массивов проверяйте их наличие:
   ```typescript
   const testimonials = t.testimonials?.items || [];
   ```

4. **Сохранение иконок**: SVG пути и другие технические данные не переводятся, они остаются в коде компонента.

5. **Aria-labels**: Не забудьте локализовать aria-labels для доступности:
   ```typescript
   aria-label={t.howItWorks?.ariaLabel ? `${t.howItWorks.ariaLabel} ${index + 1}` : `Перейти к шагу ${index + 1}`}
   ```

## Тестирование

После интеграции проверьте:
1. ✅ Все тексты отображаются корректно на русском языке
2. ✅ Переключение на кыргызский язык работает
3. ✅ Нет ошибок в консоли
4. ✅ Fallback значения работают при загрузке
5. ✅ Динамические данные (steps, testimonials) обновляются при смене языка
