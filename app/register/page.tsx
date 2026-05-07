'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/app/i18n';

export default function RegisterPage() {
  const router = useRouter();
  const { t, isLoading: translationsLoading } = useTranslation('auth');
  const [checking, setChecking] = useState(true);

  // Проверка авторизации при загрузке
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          // Пользователь уже авторизован, редирект на дашборд
          router.push('/dashboard');
          return;
        }
      } catch (err) {
        // Ошибка или не авторизован - продолжаем
      }
      setChecking(false);
    };

    checkAuth();
  }, [router]);

  // Показываем загрузку пока проверяем авторизацию или загружаем переводы
  if (checking || translationsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00] mx-auto"></div>
          <p className="mt-4 text-gray-600">{t.register?.loading || 'Загрузка...'}</p>
        </div>
      </div>
    );
  }

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
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {t.register?.title || 'Регистрация'}
            </h2>
            <p className="text-sm text-gray-600">
              {t.register?.subtitle || 'Выберите тип аккаунта'}
            </p>
          </div>

          <div className="space-y-4">
            <Link
              href="/register/volunteer"
              className="block group"
            >
              <div className="border-2 border-gray-200 rounded-2xl p-6 hover:border-[#00CC00] hover:bg-[#00CC00]/5 transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-[#00CC00]/10 flex items-center justify-center group-hover:bg-[#00CC00]/20 transition-colors">
                      <svg className="w-6 h-6 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {t.register?.volunteer?.title || 'Я волонтёр'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {t.register?.volunteer?.description || 'Хочу участвовать в проектах'}
                      </p>
                    </div>
                  </div>
                  <svg className="w-6 h-6 text-gray-400 group-hover:text-[#00CC00] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>

            <Link
              href="/register/organizer"
              className="block group"
            >
              <div className="border-2 border-gray-200 rounded-2xl p-6 hover:border-[#00CC00] hover:bg-[#00CC00]/5 transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-[#00CC00]/10 flex items-center justify-center group-hover:bg-[#00CC00]/20 transition-colors">
                      <svg className="w-6 h-6 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {t.register?.organizer?.title || 'Я организатор'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {t.register?.organizer?.description || 'Хочу создавать проекты'}
                      </p>
                    </div>
                  </div>
                  <svg className="w-6 h-6 text-gray-400 group-hover:text-[#00CC00] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              {t.register?.haveAccount || 'Уже есть аккаунт?'}{' '}
              <Link href="/login" className="text-[#00CC00] font-semibold hover:underline">
                {t.register?.signIn || 'Войти'}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
