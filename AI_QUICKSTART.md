# 🚀 AI Помощник - Быстрый старт

## ✅ Что уже готово

1. ✅ OpenAI библиотека установлена (`npm install openai`)
2. ✅ API ключ в `.env` (OPEN_AI)
3. ✅ Все файлы созданы
4. ✅ Настроена модель GPT-4o mini (самая дешевая)

## 🎯 Доступные страницы

### 1. Основной чат
```
http://localhost:3000/ai-assistant
```
Полноценный чат с AI помощником

### 2. Тестовая страница
```
http://localhost:3000/ai-test
```
Проверка всех функций одной кнопкой

## 📁 Созданные файлы

```
lib/
  └── openai.ts                    # Конфигурация OpenAI

app/
  ├── ai-assistant/
  │   └── page.tsx                 # Страница чата
  ├── ai-test/
  │   └── page.tsx                 # Тестовая страница
  └── api/ai/
      ├── chat/route.ts            # Основной чат API
      ├── suggestions/route.ts     # Рекомендации проектов
      ├── analyze-project/route.ts # Анализ описания проекта
      └── generate-tasks/route.ts  # Генерация задач

components/
  └── AIAssistantWidget.tsx        # Виджет для встраивания
```

## 🏃 Запуск

1. **Запусти сервер** (если еще не запущен):
```bash
npm run dev
```

2. **Открой браузер**:
```
http://localhost:3000/ai-assistant
```

3. **Задай вопрос**:
```
Как стать волонтером?
```

## 🧪 Тестирование

### Быстрый тест:
```
http://localhost:3000/ai-test
```
Нажми на кнопки для проверки всех функций.

### Ручной тест API:
```bash
# Тест чата
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Привет!"}'

# Тест рекомендаций
curl -X POST http://localhost:3000/api/ai/suggestions \
  -H "Content-Type: application/json" \
  -d '{"userInterests":["экология"],"projectDescription":"Уборка парка"}'
```

## 💡 Примеры использования

### 1. Добавить виджет на страницу
```typescript
// app/page.tsx
import AIAssistantWidget from '@/components/AIAssistantWidget';

export default function Home() {
  return (
    <div>
      <h1>Главная страница</h1>
      <AIAssistantWidget />
    </div>
  );
}
```

### 2. Использовать в коде
```typescript
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Мой вопрос' }),
});

const data = await response.json();
console.log(data.reply); // Ответ AI
```

### 3. Анализ проекта
```typescript
const response = await fetch('/api/ai/analyze-project', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectTitle: 'Название',
    projectDescription: 'Описание...',
  }),
});

const data = await response.json();
console.log(data.analysis); // Советы по улучшению
```

## 💰 Стоимость

**GPT-4o mini** - самая дешевая модель GPT-4:
- 1 сообщение ≈ $0.0003 (0.03₽)
- 1000 сообщений ≈ $0.30 (30₽)
- 10000 сообщений ≈ $3 (300₽)

**Оптимизация:**
- ✅ Ограничение токенов (max_tokens: 500)
- ✅ Короткая история (5 последних сообщений)
- ✅ Эффективные промпты

## 🔧 Настройка

### Изменить лимит токенов:
```typescript
// lib/openai.ts
export const AI_CONFIG = {
  model: 'gpt-4o-mini',
  temperature: 0.7,
  max_tokens: 500, // Измени здесь (100-2000)
};
```

### Изменить поведение:
```typescript
// lib/openai.ts
export const SYSTEM_PROMPT = `Твой новый промпт...`;
```

## 🐛 Проблемы?

### Ошибка "Неверный API ключ"
1. Проверь `.env` файл
2. Убедись что ключ начинается с `sk-proj-`
3. Перезапусти сервер (`npm run dev`)

### Ошибка "Превышен лимит"
1. Подожди 1 минуту
2. Проверь баланс: https://platform.openai.com/account/billing
3. Добавь средства на счет

### Не работает?
1. Открой консоль браузера (F12)
2. Проверь логи сервера в терминале
3. Убедись что сервер запущен (`npm run dev`)

## 📊 Мониторинг

### В интерфейсе:
Каждый ответ показывает:
- Количество токенов
- Примерную стоимость

### В OpenAI Dashboard:
https://platform.openai.com/usage

## 🎉 Готово!

Теперь у тебя есть полноценный AI помощник с минимальными затратами!

**Следующие шаги:**
1. Открой `/ai-assistant` и протестируй
2. Открой `/ai-test` для проверки всех функций
3. Добавь виджет на нужные страницы
4. Настрой под свои нужды

---

**Вопросы?** Проверь `AI_ASSISTANT_README.md` для подробной документации.
