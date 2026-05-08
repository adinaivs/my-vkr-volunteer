'use client';

import { useState } from 'react';

// Виджет AI помощника для встраивания на любую страницу
export default function AIAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const askAI = async () => {
    if (!message.trim() || loading) return;

    setLoading(true);
    setResponse('');

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error);
      }

      setResponse(data.reply);
    } catch (error: any) {
      setResponse('❌ ' + (error.message || 'Ошибка'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Кнопка открытия */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg z-50 transition"
          title="AI Помощник"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}

      {/* Окно чата */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 bg-white rounded-lg shadow-2xl z-50 flex flex-col max-h-[600px]">
          {/* Заголовок */}
          <div className="bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
            <div>
              <h3 className="font-bold">🤖 AI Помощник</h3>
              <p className="text-xs text-blue-100">Задай вопрос</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          {/* Область ответа */}
          <div className="flex-1 p-4 overflow-y-auto">
            {!response && !loading && (
              <p className="text-gray-400 text-sm text-center mt-8">
                Задай мне вопрос о волонтерстве 👇
              </p>
            )}
            
            {loading && (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}

            {response && (
              <div className="bg-gray-100 rounded-lg p-3 text-sm">
                <p className="whitespace-pre-wrap">{response}</p>
              </div>
            )}
          </div>

          {/* Поле ввода */}
          <div className="p-4 border-t">
            <div className="flex space-x-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && askAI()}
                placeholder="Твой вопрос..."
                className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <button
                onClick={askAI}
                disabled={loading || !message.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded text-sm"
              >
                →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
