# 🔌 Примеры интеграции AI помощника

## 1. Добавить виджет на главную страницу

```typescript
// app/page.tsx
import AIAssistantWidget from '@/components/AIAssistantWidget';

export default function HomePage() {
  return (
    <div>
      <h1>Добро пожаловать!</h1>
      <p>Найди свой волонтерский проект</p>
      
      {/* AI виджет в правом нижнем углу */}
      <AIAssistantWidget />
    </div>
  );
}
```

## 2. Умные рекомендации проектов

```typescript
// app/projects/page.tsx
'use client';

import { useState, useEffect } from 'react';

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [suggestions, setSuggestions] = useState<Record<string, string>>({});

  const getAISuggestion = async (project: any) => {
    const res = await fetch('/api/ai/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userInterests: ['экология', 'дети'], // Из профиля пользователя
        userSkills: ['организация', 'фотография'],
        projectDescription: project.description,
      }),
    });

    const data = await res.json();
    setSuggestions(prev => ({
      ...prev,
      [project.id]: data.suggestion,
    }));
  };

  return (
    <div>
      {projects.map(project => (
        <div key={project.id}>
          <h3>{project.title}</h3>
          <p>{project.description}</p>
          
          {/* Кнопка для получения рекомендации */}
          <button onClick={() => getAISuggestion(project)}>
            🤖 Подходит ли мне?
          </button>
          
          {/* Показываем рекомендацию AI */}
          {suggestions[project.id] && (
            <div className="bg-blue-50 p-3 rounded mt-2">
              <p className="text-sm">{suggestions[project.id]}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

## 3. Помощник при создании проекта

```typescript
// app/organizer/create-project/page.tsx
'use client';

import { useState } from 'react';

export default function CreateProjectPage() {
  const [description, setDescription] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [generatedTasks, setGeneratedTasks] = useState([]);

  const analyzeDescription = async () => {
    const res = await fetch('/api/ai/analyze-project', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectTitle: 'Мой проект',
        projectDescription: description,
      }),
    });

    const data = await res.json();
    setAnalysis(data.analysis);
  };

  const generateTasks = async () => {
    const res = await fetch('/api/ai/generate-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectDescription: description,
        numberOfTasks: 5,
      }),
    });

    const data = await res.json();
    setGeneratedTasks(data.tasks);
  };

  return (
    <div>
      <h1>Создать проект</h1>
      
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Опишите ваш проект..."
        className="w-full p-3 border rounded"
      />

      <div className="flex gap-2 mt-2">
        <button
          onClick={analyzeDescription}
          className="bg-purple-600 text-white px-4 py-2 rounded"
        >
          🔍 Анализировать описание
        </button>

        <button
          onClick={generateTasks}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          📝 Сгенерировать задачи
        </button>
      </div>

      {/* Показываем анализ */}
      {analysis && (
        <div className="bg-purple-50 p-4 rounded mt-4">
          <h3 className="font-bold mb-2">💡 Рекомендации AI:</h3>
          <p className="whitespace-pre-wrap">{analysis}</p>
        </div>
      )}

      {/* Показываем сгенерированные задачи */}
      {generatedTasks.length > 0 && (
        <div className="mt-4">
          <h3 className="font-bold mb-2">📋 Предложенные задачи:</h3>
          {generatedTasks.map((task: any, idx) => (
            <div key={idx} className="bg-green-50 p-3 rounded mb-2">
              <p className="font-semibold">{task.title}</p>
              <p className="text-sm text-gray-600">{task.description}</p>
              <p className="text-xs text-gray-500 mt-1">
                ⏱️ {task.estimatedHours} часов
              </p>
              <button className="text-sm text-blue-600 mt-2">
                ➕ Добавить эту задачу
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## 4. Чат-помощник в профиле волонтера

```typescript
// app/volunteer/profile/page.tsx
'use client';

import { useState } from 'react';

export default function VolunteerProfilePage() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const askAI = async () => {
    setLoading(true);
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: question }),
    });

    const data = await res.json();
    setAnswer(data.reply);
    setLoading(false);
  };

  return (
    <div>
      <h1>Мой профиль</h1>
      
      {/* Профиль пользователя */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <h2>Информация</h2>
        {/* ... */}
      </div>

      {/* Быстрый AI помощник */}
      <div className="bg-blue-50 p-4 rounded">
        <h3 className="font-bold mb-2">🤖 Есть вопросы?</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && askAI()}
            placeholder="Спроси AI помощника..."
            className="flex-1 p-2 border rounded"
          />
          <button
            onClick={askAI}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            {loading ? '...' : 'Спросить'}
          </button>
        </div>

        {answer && (
          <div className="bg-white p-3 rounded mt-3">
            <p className="text-sm">{answer}</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

## 5. Контекстная помощь на странице проекта

```typescript
// app/projects/[id]/page.tsx
'use client';

import { useState } from 'react';

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const [showAIHelp, setShowAIHelp] = useState(false);
  const [aiResponse, setAIResponse] = useState('');

  const getContextHelp = async (context: string) => {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Объясни кратко: ${context}`,
      }),
    });

    const data = await res.json();
    setAIResponse(data.reply);
    setShowAIHelp(true);
  };

  return (
    <div>
      <h1>Детали проекта</h1>
      
      {/* Информация о проекте */}
      <div className="bg-white p-4 rounded shadow">
        <h2>Описание</h2>
        <p>Помощь приюту для животных...</p>
        
        {/* Кнопка контекстной помощи */}
        <button
          onClick={() => getContextHelp('Что делает волонтер в приюте для животных?')}
          className="text-sm text-blue-600 mt-2"
        >
          ❓ Что я буду делать?
        </button>
      </div>

      {/* Требования */}
      <div className="bg-white p-4 rounded shadow mt-4">
        <h2>Требования</h2>
        <ul>
          <li>Опыт работы с животными</li>
          <li>Физическая выносливость</li>
        </ul>
        
        <button
          onClick={() => getContextHelp('Какие навыки нужны для работы с животными?')}
          className="text-sm text-blue-600 mt-2"
        >
          ❓ Какие навыки нужны?
        </button>
      </div>

      {/* Модальное окно с ответом AI */}
      {showAIHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="font-bold mb-3">🤖 AI Помощник</h3>
            <p className="text-sm mb-4">{aiResponse}</p>
            <button
              onClick={() => setShowAIHelp(false)}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Понятно
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

## 6. Умный поиск проектов

```typescript
// app/search/page.tsx
'use client';

import { useState } from 'react';

export default function SearchPage() {
  const [naturalQuery, setNaturalQuery] = useState('');
  const [aiInterpretation, setAIInterpretation] = useState('');

  const interpretSearch = async () => {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Пользователь ищет проект: "${naturalQuery}". 
        Какие ключевые слова и категории подходят? 
        Ответь кратко в формате: категории, навыки, ключевые слова.`,
      }),
    });

    const data = await res.json();
    setAIInterpretation(data.reply);
    
    // Здесь можно использовать интерпретацию для поиска
    // searchProjects(data.reply);
  };

  return (
    <div>
      <h1>Поиск проектов</h1>
      
      <div className="mb-4">
        <input
          type="text"
          value={naturalQuery}
          onChange={(e) => setNaturalQuery(e.target.value)}
          placeholder="Опишите что вы ищете своими словами..."
          className="w-full p-3 border rounded"
        />
        <button
          onClick={interpretSearch}
          className="mt-2 bg-blue-600 text-white px-4 py-2 rounded"
        >
          🔍 Умный поиск с AI
        </button>
      </div>

      {aiInterpretation && (
        <div className="bg-blue-50 p-4 rounded mb-4">
          <p className="text-sm font-semibold mb-1">AI понял ваш запрос как:</p>
          <p className="text-sm">{aiInterpretation}</p>
        </div>
      )}

      {/* Результаты поиска */}
    </div>
  );
}
```

## 7. Автоматические подсказки при заполнении формы

```typescript
// components/SmartTextarea.tsx
'use client';

import { useState, useEffect } from 'react';

export default function SmartTextarea({ 
  value, 
  onChange, 
  placeholder 
}: { 
  value: string; 
  onChange: (v: string) => void; 
  placeholder: string;
}) {
  const [suggestion, setSuggestion] = useState('');
  const [showSuggestion, setShowSuggestion] = useState(false);

  useEffect(() => {
    // Показываем подсказку если текст короткий
    if (value.length > 10 && value.length < 50) {
      getSuggestion();
    }
  }, [value]);

  const getSuggestion = async () => {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Пользователь начал писать: "${value}". 
        Предложи как продолжить (1 предложение).`,
      }),
    });

    const data = await res.json();
    setSuggestion(data.reply);
    setShowSuggestion(true);
  };

  const applySuggestion = () => {
    onChange(value + ' ' + suggestion);
    setShowSuggestion(false);
  };

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-3 border rounded"
      />

      {showSuggestion && (
        <div className="absolute top-full left-0 right-0 bg-yellow-50 border border-yellow-200 p-2 rounded mt-1 z-10">
          <p className="text-xs text-gray-600 mb-1">💡 AI предлагает:</p>
          <p className="text-sm mb-2">{suggestion}</p>
          <div className="flex gap-2">
            <button
              onClick={applySuggestion}
              className="text-xs bg-blue-600 text-white px-3 py-1 rounded"
            >
              Применить
            </button>
            <button
              onClick={() => setShowSuggestion(false)}
              className="text-xs text-gray-600"
            >
              Отклонить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 💡 Советы по интеграции

1. **Используй виджет** для общих вопросов
2. **API endpoints** для специфичных функций
3. **Кэшируй** повторяющиеся запросы
4. **Показывай loading** состояния
5. **Обрабатывай ошибки** gracefully
6. **Мониторь затраты** через usage в ответах

## 🎯 Лучшие практики

- ✅ Короткие промпты = меньше токенов
- ✅ Ограничивай max_tokens
- ✅ Используй кэш для FAQ
- ✅ Показывай стоимость пользователю
- ✅ Добавляй rate limiting
- ✅ Логируй все запросы
