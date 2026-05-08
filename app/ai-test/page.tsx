'use client';

import { useState } from 'react';

export default function AITestPage() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState<string | null>(null);

  const testChat = async () => {
    setLoading('chat');
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Привет! Расскажи кратко о волонтерстве.',
        }),
      });
      const data = await res.json();
      setResults((prev: any) => ({ ...prev, chat: data }));
    } catch (error: any) {
      setResults((prev: any) => ({ ...prev, chat: { error: error.message } }));
    }
    setLoading(null);
  };

  const testSuggestions = async () => {
    setLoading('suggestions');
    try {
      const res = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInterests: ['экология', 'животные'],
          userSkills: ['фотография', 'организация'],
          projectDescription: 'Помощь приюту для животных: кормление, уборка, фотосессии для пристройства',
        }),
      });
      const data = await res.json();
      setResults((prev: any) => ({ ...prev, suggestions: data }));
    } catch (error: any) {
      setResults((prev: any) => ({ ...prev, suggestions: { error: error.message } }));
    }
    setLoading(null);
  };

  const testAnalyze = async () => {
    setLoading('analyze');
    try {
      const res = await fetch('/api/ai/analyze-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectTitle: 'Помощь детскому дому',
          projectDescription: 'Нужны волонтеры для помощи детям',
        }),
      });
      const data = await res.json();
      setResults((prev: any) => ({ ...prev, analyze: data }));
    } catch (error: any) {
      setResults((prev: any) => ({ ...prev, analyze: { error: error.message } }));
    }
    setLoading(null);
  };

  const testGenerateTasks = async () => {
    setLoading('tasks');
    try {
      const res = await fetch('/api/ai/generate-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectDescription: 'Организация благотворительного концерта для сбора средств на лечение детей',
          numberOfTasks: 4,
        }),
      });
      const data = await res.json();
      setResults((prev: any) => ({ ...prev, tasks: data }));
    } catch (error: any) {
      setResults((prev: any) => ({ ...prev, tasks: { error: error.message } }));
    }
    setLoading(null);
  };

  const renderResult = (key: string, data: any) => {
    if (!data) return null;

    return (
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h3 className="font-bold text-lg mb-2 capitalize">{key}</h3>
        
        {data.error && (
          <div className="bg-red-100 text-red-700 p-3 rounded">
            ❌ {data.error}
          </div>
        )}

        {data.reply && (
          <div className="bg-blue-50 p-3 rounded mb-2">
            <p className="text-sm">{data.reply}</p>
          </div>
        )}

        {data.suggestion && (
          <div className="bg-green-50 p-3 rounded mb-2">
            <p className="text-sm">{data.suggestion}</p>
          </div>
        )}

        {data.analysis && (
          <div className="bg-purple-50 p-3 rounded mb-2">
            <p className="text-sm whitespace-pre-wrap">{data.analysis}</p>
          </div>
        )}

        {data.tasks && data.tasks.length > 0 && (
          <div className="space-y-2">
            {data.tasks.map((task: any, idx: number) => (
              <div key={idx} className="bg-yellow-50 p-3 rounded">
                <p className="font-semibold">{task.title}</p>
                <p className="text-sm text-gray-600">{task.description}</p>
                <p className="text-xs text-gray-500 mt-1">
                  ⏱️ {task.estimatedHours} часов
                </p>
              </div>
            ))}
          </div>
        )}

        {data.usage && (
          <div className="mt-3 pt-3 border-t text-xs text-gray-600">
            📊 Токены: {data.usage.prompt_tokens} + {data.usage.completion_tokens} = {data.usage.total_tokens}
            {' • '}
            💰 ~${((data.usage.total_tokens / 1000000) * 0.15).toFixed(6)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold mb-2">🧪 Тестирование AI Помощника</h1>
          <p className="text-gray-600">Проверка всех функций GPT-4o mini</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button
            onClick={testChat}
            disabled={loading === 'chat'}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white p-4 rounded-lg font-semibold"
          >
            {loading === 'chat' ? '⏳ Загрузка...' : '💬 Тест: Чат'}
          </button>

          <button
            onClick={testSuggestions}
            disabled={loading === 'suggestions'}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white p-4 rounded-lg font-semibold"
          >
            {loading === 'suggestions' ? '⏳ Загрузка...' : '🎯 Тест: Рекомендации'}
          </button>

          <button
            onClick={testAnalyze}
            disabled={loading === 'analyze'}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white p-4 rounded-lg font-semibold"
          >
            {loading === 'analyze' ? '⏳ Загрузка...' : '🔍 Тест: Анализ проекта'}
          </button>

          <button
            onClick={testGenerateTasks}
            disabled={loading === 'tasks'}
            className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white p-4 rounded-lg font-semibold"
          >
            {loading === 'tasks' ? '⏳ Загрузка...' : '📝 Тест: Генерация задач'}
          </button>
        </div>

        <div className="space-y-4">
          {renderResult('chat', results.chat)}
          {renderResult('suggestions', results.suggestions)}
          {renderResult('analyze', results.analyze)}
          {renderResult('tasks', results.tasks)}
        </div>

        {Object.keys(results).length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
            <p>Нажми на кнопки выше для тестирования функций AI</p>
          </div>
        )}
      </div>
    </div>
  );
}
