'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AiSupportButton from '@/app/components/AiSupportButton';
import Image from 'next/image';
import { useTranslation } from '@/app/i18n';

export default function VolunteerRegisterPage() {
  const router = useRouter();
  const { t, isLoading: translationsLoading } = useTranslation('auth');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!agreedToTerms) {
      setError(t.volunteerRegister?.errors?.agreeRequired || 'Необходимо согласиться с правилами платформы');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t.volunteerRegister?.errors?.passwordMismatch || 'Пароли не совпадают');
      return;
    }

    if (formData.password.length < 6) {
      setError(t.volunteerRegister?.errors?.passwordTooShort || 'Пароль должен содержать минимум 6 символов');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          city: 'Бишкек',
          role: 'volunteer',
        }),
      });

      // Проверяем content-type перед парсингом
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error(t.volunteerRegister?.errors?.serverError || 'Сервер вернул некорректный ответ. Проверьте консоль браузера.');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t.volunteerRegister?.errors?.registrationError || 'Ошибка при регистрации');
      }

      // Перенаправление на страницу верификации email
      router.push(`/register/verify?email=${encodeURIComponent(formData.email)}`);
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
          <p className="mt-4 text-gray-600">{t.volunteerRegister?.loading || 'Загрузка...'}</p>
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
                {t.volunteerRegister?.title || 'Регистрация'}
              </h2>
              
              {/* Переключатель роли */}
              <div className="flex justify-center gap-3 mt-6 mb-4">
                <Link
                  href="/register/volunteer"
                  className="px-8 py-2.5 bg-[#00CC00] text-white rounded-full font-medium text-sm shadow-md"
                >
                  {t.volunteerRegister?.volunteer || 'Волонтёр'}
                </Link>
                <Link
                  href="/register/organizer"
                  className="px-8 py-2.5 bg-gray-100 text-gray-700 rounded-full font-medium text-sm hover:bg-gray-200 transition-colors"
                >
                  {t.volunteerRegister?.organizer || 'Организатор'}
                </Link>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                  <div className="text-sm text-red-800">{error}</div>
                </div>
              )}

              {/* ФИО */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.volunteerRegister?.fullName || 'ФИО'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    placeholder={t.volunteerRegister?.firstName || 'Имя'}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent transition-all text-sm"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                  <input
                    type="text"
                    required
                    placeholder={t.volunteerRegister?.lastName || 'Фамилия'}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent transition-all text-sm"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.volunteerRegister?.email || 'Email'}
                </label>
                <input
                  type="email"
                  required
                  placeholder={t.volunteerRegister?.emailPlaceholder || 'your@email.com'}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent transition-all text-sm"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              {/* Телефон */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.volunteerRegister?.phone || 'Телефон'}
                </label>
                <input
                  type="tel"
                  required
                  placeholder={t.volunteerRegister?.phonePlaceholder || '+996 XXX XXX XXX'}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent transition-all text-sm"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              {/* Пароль */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.volunteerRegister?.password || 'Пароль'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder={t.volunteerRegister?.passwordPlaceholder || '••••••••'}
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

              {/* Подтверждение пароля */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.volunteerRegister?.confirmPassword || 'Подтверждение пароля'}
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder={t.volunteerRegister?.confirmPasswordPlaceholder || '••••••••'}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent transition-all text-sm pr-12"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? (
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

              {/* Чекбокс согласия */}
              <div className="flex items-start">
                <input
                  id="terms"
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 text-[#00CC00] focus:ring-[#00CC00] border-gray-300 rounded"
                />
                <label htmlFor="terms" className="ml-3 text-sm text-gray-600">
                  {t.volunteerRegister?.agreeToTerms || 'Я согласен/на с'}{' '}
                  <a href="#" className="text-[#00CC00] hover:underline">
                    {t.volunteerRegister?.platformRules || 'правилами платформы'}
                  </a>
                </label>
              </div>

              {/* Кнопка регистрации */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#00CC00] text-white rounded-xl font-semibold hover:bg-[#00b300] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#00CC00]/20"
              >
                {loading ? (t.volunteerRegister?.registering || 'Регистрация...') : (t.volunteerRegister?.registerButton || 'Зарегистрироваться')}
              </button>
            </form>

            {/* Ссылка на вход */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                {t.volunteerRegister?.haveAccount || 'У вас уже есть аккаунт?'}{' '}
                <Link href="/login" className="text-[#00CC00] font-semibold hover:underline">
                  {t.volunteerRegister?.signIn || 'Войти'}
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
