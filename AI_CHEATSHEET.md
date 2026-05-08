# 🚀 AI Помощник - Шпаргалка

## Быстрый старт
```bash
npm run dev
# Открой: http://localhost:3000/ai-assistant
```

## 📍 Страницы
- `/ai-assistant` - Чат с AI
- `/ai-test` - Тестирование функций

## 🔌 API Endpoints

### Чат
```typescript
POST /api/ai/chat
{ "message": "Привет!" }
```

### Рекомендации
```typescript
POST /api/ai/suggestions
{
  "userInterests": ["экология"],
  "userSkills": ["фотография"],
  "projectDescription": "..."
}
```

### Анализ проекта
```typescript
POST /api/ai/analyze-project
{
  "projectTitle": "Название",
  "projectDescription": "..."
}
```

### Генерация задач
```typescript
POST /api/ai/generate-tasks
{
  "projectDescription": "...",
  "numberOfTasks": 3
}
```

## 🎨 Виджет
```typescript
import AIAssistantWidget from '@/components/AIAssistantWidget';

<AIAssistantWidget />
```

## ⚙️ Настройки
```typescript
// lib/openai.ts
export const AI_CONFIG = {
  model: 'gpt-4o-mini',
  temperature: 0.7,
  max_tokens: 500,
};
```

## 💰 Стоимость
- 1 сообщение ≈ $0.0003 (0.03₽)
- 1000 сообщений ≈ $0.30 (30₽)

## 🐛 Проблемы

### Неверный ключ
```bash
# Проверь .env
OPEN_AI="sk-proj-..."
# Перезапусти
npm run dev
```

### Превышен лимит
- Подожди 1 минуту
- Проверь баланс: https://platform.openai.com/account/billing

## 📊 Мониторинг
- В интерфейсе: показывает токены и стоимость
- Dashboard: https://platform.openai.com/usage

## 📚 Документация
- `AI_QUICKSTART.md` - Быстрый старт
- `AI_ASSISTANT_README.md` - Полная документация
- `AI_INSTALLATION_COMPLETE.md` - Что установлено
