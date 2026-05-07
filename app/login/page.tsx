'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AiSupportButton from '@/app/components/AiSupportButton';
import { useTranslation } from '@/app/i18n';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, isLoading: translationsLoading } = useTranslation('auth');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
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

  useEffect(() => {
    if (checking || translationsLoading) return;
    
    const errorParam = searchParams.get('error');
    const resetParam = searchParams.get('reset');
    
    if (resetParam === 'success') {
      setSuccessMessage(t.login?.success?.passwordReset || 'Пароль успешно изменен. Войдите с новым паролем.');
    }
    
    if (errorParam) {
      switch (errorParam) {
        case 'google_auth_failed':
          setError(t.login?.errors?.googleAuthFailed || 'Ошибка авторизации через Google');
          break;
        case 'no_code':
          setError(t.login?.errors?.noCode || 'Не получен код авторизации');
          break;
        case 'auth_failed':
          setError(t.login?.errors?.authFailed || 'Ошибка авторизации');
          break;
      }
    }
  }, [searchParams, checking, translationsLoading, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t.login?.errors?.loginError || 'Ошибка при входе');
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  // Показываем загрузку пока проверяем авторизацию или загружаем переводы
  if (checking || translationsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00] mx-auto"></div>
          <p className="mt-4 text-gray-600">{t.login?.loading || 'Загрузка...'}</p>
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
            {/* Заголовок */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {t.login?.title || 'Вход'}
              </h2>
              <p className="text-sm text-gray-600">
                {t.login?.subtitle || 'Добро пожаловать обратно!'}
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {successMessage && (
                <div className="rounded-xl bg-green-50 border border-green-200 p-4">
                  <div className="text-sm text-green-800">{successMessage}</div>
                </div>
              )}
              
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                  <div className="text-sm text-red-800">{error}</div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.login?.email || 'Email'}
                </label>
                <input
                  type="email"
                  required
                  placeholder={t.login?.emailPlaceholder || 'your@email.com'}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent transition-all text-sm"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              {/* Пароль */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.login?.password || 'Пароль'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder={t.login?.passwordPlaceholder || '••••••••'}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent transition-all text-sm pr-12"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Запомнить меня и забыли пароль */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-[#00CC00] focus:ring-[#00CC00] border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                    {t.login?.rememberMe || 'Запомнить меня'}
                  </label>
                </div>

                <div className="text-sm">
                  <Link href="/forgot-password" className="text-[#00CC00] hover:underline font-medium">
                    {t.login?.forgotPassword || 'Забыли пароль?'}
                  </Link>
                </div>
              </div>

              {/* Кнопка входа */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#00CC00] text-white rounded-xl font-semibold hover:bg-[#00b300] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#00CC00]/20"
              >
                {loading ? (t.login?.loggingIn || 'Вход...') : (t.login?.loginButton || 'Войти')}
              </button>

              {/* Разделитель */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">
                    {t.login?.orLoginWith || 'Или войдите с помощью'}
                  </span>
                </div>
              </div>

              {/* Кнопка Google */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="text-sm font-medium text-gray-700">{t.login?.googleLogin || 'Войти через Google'}</span>
              </button>
            </form>

            {/* Ссылка на регистрацию */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                {t.login?.noAccount || 'Нет аккаунта?'}{' '}
                <Link href="/register" className="text-[#00CC00] font-semibold hover:underline">
                  {t.login?.signUp || 'Зарегистрироваться'}
                </Link>
              </p>
            </div>
          </div>
      </div>

      {/* AI Support Button */}
      <AiSupportButton />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00] mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
