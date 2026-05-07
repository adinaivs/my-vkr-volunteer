'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SuccessContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type');
  const isOrganizer = type === 'organizer';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Декоративные элементы - растения */}
      <div className="absolute left-0 bottom-0 w-96 h-96 opacity-40 pointer-events-none">
        <div className="relative w-full h-full">
          <div className="absolute bottom-0 left-0 w-64 h-80 bg-gradient-to-t from-[#00CC00]/20 to-transparent rounded-t-full transform -rotate-12"></div>
          <div className="absolute bottom-0 left-12 w-48 h-72 bg-gradient-to-t from-[#00CC00]/30 to-transparent rounded-t-full transform rotate-6"></div>
        </div>
      </div>
      
      <div className="absolute right-0 bottom-0 w-96 h-96 opacity-40 pointer-events-none">
        <div className="relative w-full h-full">
          <div className="absolute bottom-0 right-0 w-56 h-96 bg-gradient-to-t from-[#00CC00]/25 to-transparent rounded-t-full transform rotate-12"></div>
          <div className="absolute bottom-0 right-16 w-40 h-80 bg-gradient-to-t from-[#00CC00]/20 to-transparent rounded-t-full transform -rotate-6"></div>
        </div>
      </div>

      {/* Белая карточка */}
      <div className="w-full max-w-lg relative z-10">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10">
          {/* Иконка успеха */}
          <div className="text-center mb-6">
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-[#00CC00]/10 mb-4">
              <svg
                className="h-12 w-12 text-[#00CC00]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Регистрация успешна!
            </h2>
          </div>
          
          {isOrganizer ? (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-800 mb-2">
                      Ваш аккаунт организатора создан и отправлен на проверку администраторам.
                    </p>
                    <p className="text-sm text-blue-800 mb-2">
                      <strong>Время проверки:</strong> 1-3 рабочих дня
                    </p>
                    <p className="text-sm text-blue-800">
                      Уведомление о результатах проверки придёт на указанный email.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <Link
                  href="/dashboard"
                  className="block w-full px-6 py-3.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors text-center shadow-lg shadow-blue-600/20"
                >
                  Перейти в личный кабинет
                </Link>
                
                <Link
                  href="/"
                  className="block w-full px-6 py-3.5 bg-white text-gray-700 border-2 border-gray-200 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-center"
                >
                  На главную
                </Link>
              </div>

              <div className="bg-gray-50 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Что дальше?
                </h3>
                <ul className="space-y-2.5">
                  <li className="flex items-start text-sm text-gray-700">
                    <span className="text-[#00CC00] mr-2 mt-0.5">✓</span>
                    <span>Вы можете войти в личный кабинет</span>
                  </li>
                  <li className="flex items-start text-sm text-gray-700">
                    <span className="text-[#00CC00] mr-2 mt-0.5">✓</span>
                    <span>Заполните дополнительную информацию о вашей организации</span>
                  </li>
                  <li className="flex items-start text-sm text-gray-700">
                    <span className="text-yellow-500 mr-2 mt-0.5">⏳</span>
                    <span>Дождитесь подтверждения от администраторов</span>
                  </li>
                  <li className="flex items-start text-sm text-gray-700">
                    <span className="text-blue-500 mr-2 mt-0.5">→</span>
                    <span>После подтверждения вы сможете создавать проекты</span>
                  </li>
                </ul>
              </div>
            </>
          ) : (
            <>
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-800 mb-2 font-semibold">
                      Добро пожаловать на платформу волонтёрских проектов!
                    </p>
                    <p className="text-sm text-green-800">
                      Ваш аккаунт волонтёра успешно создан и готов к использованию.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <Link
                  href="/dashboard"
                  className="block w-full px-6 py-3.5 bg-[#00CC00] text-white rounded-xl font-semibold hover:bg-[#00b300] transition-colors text-center shadow-lg shadow-[#00CC00]/20"
                >
                  Перейти в личный кабинет
                </Link>
                
                <Link
                  href="/"
                  className="block w-full px-6 py-3.5 bg-white text-gray-700 border-2 border-gray-200 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-center"
                >
                  Посмотреть проекты
                </Link>
              </div>

              <div className="bg-gray-50 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Начните прямо сейчас!
                </h3>
                <ul className="space-y-2.5">
                  <li className="flex items-start text-sm text-gray-700">
                    <span className="text-[#00CC00] mr-2 mt-0.5">✓</span>
                    <span>Заполните свой профиль и добавьте навыки</span>
                  </li>
                  <li className="flex items-start text-sm text-gray-700">
                    <span className="text-[#00CC00] mr-2 mt-0.5">✓</span>
                    <span>Просматривайте доступные волонтёрские проекты</span>
                  </li>
                  <li className="flex items-start text-sm text-gray-700">
                    <span className="text-[#00CC00] mr-2 mt-0.5">✓</span>
                    <span>Подавайте заявки на участие в проектах</span>
                  </li>
                  <li className="flex items-start text-sm text-gray-700">
                    <span className="text-blue-500 mr-2 mt-0.5">🏆</span>
                    <span>Зарабатывайте достижения и награды</span>
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RegistrationSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00] mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
