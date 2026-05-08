'use client';

import { useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<any>(null);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Используем улучшенный API с контекстом платформы
      const response = await fetch('/api/ai/chat-with-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          conversationHistory: messages,
          // userId можно добавить из сессии пользователя
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка запроса');
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.reply,
      };

      setMessages(prev => [...prev, assistantMessage]);
      setUsage(data.usage);
    } catch (error: any) {
      alert(error.message || 'Ошибка отправки сообщения');
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setUsage(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Заголовок */}
          <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">🤖 AI Помощник</h1>
              <p className="text-sm text-blue-100">GPT-4o mini • Экономичный режим</p>
            </div>
            <button
              onClick={clearChat}
              className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded text-sm"
            >
              Очистить чат
            </button>
          </div>

          {/* Статистика использования */}
          {usage && (
            <div className="bg-gray-100 p-3 text-xs text-gray-600 border-b">
              📊 Токены: {usage.prompt_tokens} запрос + {usage.completion_tokens} ответ = {usage.total_tokens} всего
              {' • '}
              💰 ~${((usage.total_tokens / 1000000) * 0.15).toFixed(6)} (примерно)
              {' • '}
              🧠 Контекст: включен
            </div>
          )}

          {/* Область сообщений */}
          <div className="h-[500px] overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 mt-20">
                <p className="text-lg mb-2">👋 Привет! Я твой AI помощник</p>
                <p className="text-sm">Задай мне любой вопрос о волонтерстве</p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-200 rounded-lg p-3">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Поле ввода */}
          <div className="border-t p-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Напиши сообщение..."
                className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg font-medium transition"
              >
                {loading ? '...' : 'Отправить'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 Совет: Задавай короткие вопросы для экономии токенов
            </p>
          </div>
        </div>

        {/* Примеры вопросов */}
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Примеры вопросов:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              'Как зарегистрироваться на платформе?',
              'Какие проекты сейчас активны?',
              'Как подать заявку на проект?',
              'Что такое QR-код для подтверждения?',
            ].map((example, idx) => (
              <button
                key={idx}
                onClick={() => setInput(example)}
                className="text-left text-sm text-blue-600 hover:bg-blue-50 p-2 rounded border border-blue-200"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
