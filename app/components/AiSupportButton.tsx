'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function AiSupportButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClick = () => {
    // TODO: Открыть чат с ИИ-поддержкой
    setIsOpen(!isOpen);
    console.log('ИИ-поддержка пока не работает');
  };

  const buttonContent = (
    <>
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

      {/* Coming Soon Modal (optional) */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[9998] flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#00CC00] to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="32" 
                  height="32" 
                  fill="none" 
                  viewBox="0 0 32 32"
                  className="text-white"
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
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                VolunteerGPT
              </h3>
              <p className="text-gray-600 mb-6">
                Функция находится в разработке. Скоро вы сможете получать мгновенные ответы на свои вопросы от умного ИИ-ассистента для волонтеров!
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

  // Используем портал для рендера вне основного DOM дерева
  if (!mounted || typeof window === 'undefined') return null;
  
  return createPortal(buttonContent, document.body);
}
