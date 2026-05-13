'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AiSupportButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [windowWidth, setWindowWidth] = useState(384);
  const [isResizing, setIsResizing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef({ x: 0, width: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const deltaX = resizeStartRef.current.x - e.clientX;
      const newWidth = Math.max(320, Math.min(800, resizeStartRef.current.width + deltaX));
      
      setWindowWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      width: windowWidth,
    };
  };

  const handleClick = () => {
    setIsOpen(!isOpen);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Добавляем пустое сообщение ассистента для streaming (с пустым контентом - будет показана анимация)
    const assistantMessageIndex = messages.length + 1;
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      // Используем улучшенный API с Function Calling и Streaming
      const response = await fetch('/api/ai/chat-with-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          conversationHistory: messages,
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка запроса');
      }

      // Проверяем, является ли ответ streaming
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('text/event-stream')) {
        // Обрабатываем streaming ответ
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  
                  if (data.done) {
                    // Streaming завершен
                    console.log('✅ Streaming завершен');
                    break;
                  }
                  
                  if (data.content) {
                    accumulatedContent += data.content;
                    
                    // Обновляем сообщение ассистента
                    setMessages(prev => {
                      const newMessages = [...prev];
                      newMessages[assistantMessageIndex] = {
                        role: 'assistant',
                        content: accumulatedContent,
                      };
                      return newMessages;
                    });
                  }
                } catch (e) {
                  // Игнорируем ошибки парсинга
                }
              }
            }
          }
        }
      } else {
        // Обычный JSON ответ (fallback)
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }

        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[assistantMessageIndex] = {
            role: 'assistant',
            content: data.reply,
          };
          return newMessages;
        });
      }
    } catch (error: any) {
      console.error('Ошибка:', error);
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[assistantMessageIndex] = {
          role: 'assistant',
          content: 'Извините, произошла ошибка. Попробуйте еще раз.',
        };
        return newMessages;
      });
    } finally {
      setLoading(false);
    }
  };

  const buttonContent = (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div 
          className="fixed bottom-24 right-6 lg:right-8 z-[9998] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden h-[500px]"
          style={{ 
            width: `${windowWidth}px`,
            maxWidth: 'calc(100vw - 3rem)'
          }}
        >
          {/* Resize Handle - левый край */}
          <div
            onMouseDown={handleResizeStart}
            className="absolute top-0 left-0 w-1 h-full cursor-ew-resize hover:bg-[#00CC00] transition-colors z-10 group"
            title="Изменить ширину"
          >
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-gray-300 group-hover:bg-[#00CC00] rounded-r transition-colors"></div>
          </div>
          {/* Header */}
          <div className="bg-gradient-to-r from-[#00CC00] to-emerald-500 text-white p-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="24" 
                  height="24" 
                  fill="none" 
                  viewBox="0 0 32 32"
                >
                  <path 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    d="M4 13a3 3 0 0 1 3-3h18a3 3 0 0 1 3 3v7.92a3 3 0 0 1-2.35 2.93l-9 1.98a3 3 0 0 1-1.3 0l-9-1.98A3 3 0 0 1 4 20.92V13Z"
                  />
                  <circle cx="11.73" cy="17.22" r="2.44" fill="currentColor" />
                  <circle cx="20.27" cy="17.22" r="2.44" fill="currentColor" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg">VolunteerGPT</h3>
                <p className="text-xs text-white/80">AI помощник</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-gray-50">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                {/* Изображение AI */}
                <div className="flex justify-center mb-6">
                  <img 
                    src="/AI.jpg" 
                    alt="AI Assistant" 
                    className="w-32 h-32 object-cover rounded-full shadow-lg"
                  />
                </div>
                
                {/* Заголовок */}
                <p className="text-sm text-gray-600 mb-6">
                  Получите мгновенные ответы на ваши вопросы
                </p>

                <div className="mt-4 space-y-2">
                  <button
                    onClick={() => setInput('Какие проекты доступны?')}
                    className="block w-full text-left text-xs text-gray-600 hover:text-[#00CC00] bg-white p-2 rounded-lg border border-gray-200 hover:border-[#00CC00] transition-colors"
                  >
                    Какие проекты доступны?
                  </button>
                  <button
                    onClick={() => setInput('Покажи проекты по экологии')}
                    className="block w-full text-left text-xs text-gray-600 hover:text-[#00CC00] bg-white p-2 rounded-lg border border-gray-200 hover:border-[#00CC00] transition-colors"
                  >
                    Покажи проекты по экологии
                  </button>
                  <button
                    onClick={() => setInput('Какие категории есть?')}
                    className="block w-full text-left text-xs text-gray-600 hover:text-[#00CC00] bg-white p-2 rounded-lg border border-gray-200 hover:border-[#00CC00] transition-colors"
                  >
                    Какие категории есть?
                  </button>
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-[#00CC00] text-white'
                      : 'bg-white text-gray-800 border border-gray-200'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  ) : msg.content ? (
                    <div className="text-sm">
                      <MarkdownRenderer content={msg.content} />
                    </div>
                  ) : (
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-gray-200 flex-shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Напишите сообщение..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent text-sm"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="bg-[#00CC00] hover:bg-[#00b300] disabled:bg-gray-300 text-white p-2 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="fixed bottom-6 right-6 lg:bottom-8 lg:right-8 z-[9999] w-40 h-14 bg-gradient-to-br from-[#00CC00] to-emerald-500 text-white rounded-full shadow-2xl hover:shadow-[#00CC00]/50 transition-shadow duration-300 flex items-center justify-center"
        aria-label="VolunteerGPT"
      >
        {/* Text - показывается когда не наведено */}
        <span 
          className={`font-bold text-base whitespace-nowrap absolute transition-all duration-300 ${
            isHovered ? 'opacity-0 scale-75' : 'opacity-100 scale-100'
          }`}
        >
          VolunteerGPT
        </span>

        {/* Icon - показывается при наведении */}
        <div 
          className={`absolute flex items-center justify-center transition-all duration-300 ${
            isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
          }`}
        >
          {/* Иконка робота */}
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="32" 
            height="32" 
            fill="none" 
            viewBox="0 0 32 32"
          >
            <path 
              stroke="currentColor" 
              strokeWidth="2" 
              d="M4 13a3 3 0 0 1 3-3h18a3 3 0 0 1 3 3v7.92a3 3 0 0 1-2.35 2.93l-9 1.98a3 3 0 0 1-1.3 0l-9-1.98A3 3 0 0 1 4 20.92V13Z"
            />
            <circle cx="11.73" cy="17.22" r="2.44" fill="currentColor" />
            <circle cx="20.27" cy="17.22" r="2.44" fill="currentColor" />
            <path 
              stroke="currentColor" 
              strokeLinecap="round" 
              strokeWidth="2" 
              d="m15.8 9.9-3.46-3.45m4.88 3.26 3.46-3.46"
            />
          </svg>
        </div>
      </button>
    </>
  );

  // Используем портал для рендера вне основного DOM дерева
  if (!mounted || typeof window === 'undefined') return null;
  
  return createPortal(buttonContent, document.body);
}
