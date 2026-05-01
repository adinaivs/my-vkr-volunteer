'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Переводы
const translations = {
  ru: {
    title: 'Вход в админ-панель',
    subtitle: 'Введите учетные данные администратора',
    email: 'Email администратора',
    emailPlaceholder: 'admin@volonterkr.kg',
    password: 'Пароль',
    passwordPlaceholder: '••••••••',
    loginButton: 'Войти',
    loggingIn: 'Вход...',
    verifyingCode: 'Проверка кода...',
    codeTitle: 'Двухфакторная аутентификация',
    codeSubtitle: 'Введите код из Telegram',
    codeDescription: 'Мы отправили 6-значный код в ваш Telegram',
    codePlaceholder: '000000',
    verifyButton: 'Подтвердить',
    resendCode: 'Отправить код повторно',
    backToLogin: 'Вернуться к входу',
  },
  kg: {
    title: 'Админ-панелге кирүү',
    subtitle: 'Администратордун маалыматтарын киргизиңиз',
    email: 'Администратордун email',
    emailPlaceholder: 'admin@volonterkr.kg',
    password: 'Сырсөз',
    passwordPlaceholder: '••••••••',
    loginButton: 'Кирүү',
    loggingIn: 'Кирүү...',
    verifyingCode: 'Кодду текшерүү...',
    codeTitle: 'Эки факторлуу аутентификация',
    codeSubtitle: 'Telegram\'дан кодду киргизиңиз',
    codeDescription: 'Биз сиздин Telegram\'га 6 сандуу код жибердик',
    codePlaceholder: '000000',
    verifyButton: 'Ырастоо',
    resendCode: 'Кодду кайра жиберүү',
    backToLogin: 'Кирүүгө кайтуу',
  }
};

export default function AdminLoginPage() {
  const router = useRouter();
  const [locale, setLocale] = useState<'ru' | 'kg'>('ru');
  const t = translations[locale];
  const [step, setStep] = useState<'login' | 'verify'>('login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    code: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [checking, setChecking] = useState(true);

  // Проверка авторизации при загрузке
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          if (data.user.role === 'admin') {
            router.push('/admin/dashboard');
            return;
          }
        }
      } catch (err) {
        // Ошибка или не авторизован - продолжаем
      }
      setChecking(false);
    };

    checkAuth();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка сервера');
      }

      if (data.requiresTwoFactor) {
        setStep('verify');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/admin/verify-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          code: formData.code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка сервера');
      }

      router.push('/admin/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка сервера');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Показываем загрузку пока проверяем авторизацию
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00] mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Декоративные элементы */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#00CC00]/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#00CC00]/10 rounded-full blur-3xl"></div>
      </div>

      {/* Карточка входа */}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 md:p-10">
          {/* Иконка админа */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-[#00CC00] to-[#00b300] rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>

          {/* Заголовок */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {step === 'login' ? t.title : t.codeTitle}
            </h2>
            <p className="text-sm text-gray-600">
              {step === 'login' ? t.subtitle : t.codeSubtitle}
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          {step === 'login' ? (
            <form className="space-y-5" onSubmit={handleLogin}>
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.email}
                </label>
                <input
                  type="email"
                  required
                  placeholder={t.emailPlaceholder}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent transition-all text-sm"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              {/* Пароль */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.password}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder={t.passwordPlaceholder}
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

              {/* Кнопка входа */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-[#00CC00] to-[#00b300] text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-[#00CC00]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t.loggingIn : t.loginButton}
              </button>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={handleVerify}>
              {/* Описание */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#00CC00]/10 rounded-full mb-4">
                  <svg className="w-8 h-8 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600">
                  {t.codeDescription}
                </p>
              </div>

              {/* Код */}
              <div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder={t.codePlaceholder}
                  className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent transition-all text-center text-2xl font-mono tracking-widest"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.replace(/\D/g, '') })}
                />
              </div>

              {/* Кнопка подтверждения */}
              <button
                type="submit"
                disabled={loading || formData.code.length !== 6}
                className="w-full py-3.5 bg-gradient-to-r from-[#00CC00] to-[#00b300] text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-[#00CC00]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t.verifyingCode : t.verifyButton}
              </button>

              {/* Отправить код повторно */}
              <button
                type="button"
                onClick={handleResendCode}
                disabled={loading}
                className="w-full text-sm text-[#00CC00] hover:underline font-medium"
              >
                {t.resendCode}
              </button>

              {/* Вернуться к входу */}
              <button
                type="button"
                onClick={() => {
                  setStep('login');
                  setFormData({ ...formData, code: '' });
                  setError('');
                }}
                className="w-full text-sm text-gray-600 hover:text-gray-900"
              >
                {t.backToLogin}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
