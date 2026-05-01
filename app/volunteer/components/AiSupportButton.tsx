'use client';

import { useState } from 'react';

export default function AiSupportButton() {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    // TODO: Открыть чат с ИИ-поддержкой
    setIsOpen(!isOpen);
    console.log('ИИ-поддержка пока не работает');
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={handleClick}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-br from-[#00CC00] to-emerald-500 text-white rounded-full shadow-2xl hover:shadow-[#00CC00]/50 hover:scale-110 transition-all duration-300 flex items-center justify-center group"
        aria-label="ИИ-поддержка"
      >
        {/* Icon */}
        <svg 
          className="w-8 h-8 group-hover:scale-110 transition-transform" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" 
          />
        </svg>

        {/* Pulse Animation */}
        <span className="absolute inset-0 rounded-full bg-[#00CC00] animate-ping opacity-20"></span>
      </button>

      {/* Tooltip */}
      <div className="fixed bottom-24 right-6 z-40 pointer-events-none">
        <div className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          ИИ-помощник
          <div className="absolute bottom-0 right-8 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
        </div>
      </div>

      {/* Coming Soon Modal (optional) */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#00CC00] to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                ИИ-помощник
              </h3>
              <p className="text-gray-600 mb-6">
                Функция находится в разработке. Скоро вы сможете получать мгновенные ответы на свои вопросы от умного ИИ-ассистента!
              </p>
              <button
                onClick={() => setIsOpen(false)}
                className="w-full px-6 py-3 bg-[#00CC00] text-white rounded-xl font-medium hover:bg-[#00b300] transition-colors"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
