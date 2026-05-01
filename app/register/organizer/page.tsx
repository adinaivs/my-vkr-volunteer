'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AiSupportButton from '@/app/components/AiSupportButton';

export default function OrganizerRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    representativeName: '',
    organizationName: '',
    inn: '',
    okpo: '',
    organizationEmail: '',
    organizationPhone: '',
    verificationDoc: null as File | null,
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, verificationDoc: e.target.files[0] });
    }
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.representativeName || !formData.organizationName || 
        !formData.inn || !formData.okpo || 
        !formData.organizationEmail || !formData.organizationPhone) {
      setError('Все поля обязательны для заполнения');
      return;
    }

    if (formData.inn.length !== 14) {
      setError('ИНН должен содержать 14 цифр');
      return;
    }

    if (formData.okpo.length !== 8) {
      setError('ОКПО должен содержать 8 цифр');
      return;
    }

    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!agreedToTerms) {
      setError('Необходимо согласиться с правилами платформы');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (formData.password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }

    setLoading(true);

    try {
      // TODO: Загрузка файла на сервер (пока пропускаем)
      let verificationDocUrl = null;
      if (formData.verificationDoc) {
        // В будущем здесь будет загрузка файла
        console.log('Файл для загрузки:', formData.verificationDoc.name);
      }

      const nameParts = formData.representativeName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      console.log('Отправка данных регистрации организатора:', {
        email: formData.organizationEmail,
        phone: formData.organizationPhone,
        firstName,
        lastName,
        organizationName: formData.organizationName,
        inn: formData.inn,
        okpo: formData.okpo,
      });

      const response = await fetch('/api/auth/register/organizer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.organizationEmail,
          phone: formData.organizationPhone,
          password: formData.password,
          firstName,
          lastName,
          organizationName: formData.organizationName,
          inn: formData.inn,
          okpo: formData.okpo,
          verificationDocUrl,
        }),
      });

      const data = await response.json();
      console.log('Ответ сервера:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при регистрации');
      }

      // Перенаправление на страницу верификации email
      router.push(`/register/verify?email=${encodeURIComponent(formData.organizationEmail)}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = () => {
    window.location.href = '/api/auth/google';
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
              Регистрация
            </h2>
            
            {/* Переключатель роли */}
            <div className="flex justify-center gap-3 mt-6 mb-4">
              <Link
                href="/register/volunteer"
                className="px-8 py-2.5 bg-gray-100 text-gray-700 rounded-full font-medium text-sm hover:bg-gray-200 transition-colors"
              >
                Волонтёр
              </Link>
              <Link
                href="/register/organizer"
                className="px-8 py-2.5 bg-[#00CC00] text-white rounded-full font-medium text-sm shadow-md"
              >
                Организатор
              </Link>
            </div>
          </div>

          {step === 1 ? (
            <form className="space-y-5" onSubmit={handleNextStep}>
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                  <div className="text-sm text-red-800">{error}</div>
                </div>
              )}

              {/* ФИО представителя */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ФИО представителя
                </label>
                <input
                  type="text"
                  required
                  placeholder="Иванов Иван Иванович"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent transition-all text-sm"
                  value={formData.representativeName}
                  onChange={(e) => setFormData({ ...formData, representativeName: e.target.value })}
                />
              </div>

              {/* Название организации */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Название организации
                </label>
                <input
                  type="text"
                  required
                  placeholder="ОсОО Название"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent transition-all text-sm"
                  value={formData.organizationName}
                  onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                />
              </div>

              {/* ИНН и ОКПО */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ИНН
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={14}
                    placeholder="14 цифр"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent transition-all text-sm"
                    value={formData.inn}
                    onChange={(e) => setFormData({ ...formData, inn: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ОКПО
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    placeholder="8 цифр"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent transition-all text-sm"
                    value={formData.okpo}
                    onChange={(e) => setFormData({ ...formData, okpo: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email организации
                </label>
                <input
                  type="email"
                  required
                  placeholder="organization@email.com"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent transition-all text-sm"
                  value={formData.organizationEmail}
                  onChange={(e) => setFormData({ ...formData, organizationEmail: e.target.value })}
                />
              </div>

              {/* Телефон */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Телефон организации
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+996 XXX XXX XXX"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent transition-all text-sm"
                  value={formData.organizationPhone}
                  onChange={(e) => setFormData({ ...formData, organizationPhone: e.target.value })}
                />
              </div>

              {/* Загрузка документа */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Свидетельство о регистрации
                </label>
                <label className="w-full flex items-center justify-center px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                  <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-sm text-gray-600">
                    {formData.verificationDoc ? formData.verificationDoc.name : 'Загрузить файл'}
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="sr-only"
                    onChange={handleFileChange}
                  />
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  Форматы: JPG, PNG, PDF (макс. 5 МБ)
                </p>
              </div>

              {/* Кнопка далее */}
              <button
                type="submit"
                className="w-full py-3.5 bg-[#00CC00] text-white rounded-xl font-semibold hover:bg-[#00b300] transition-colors shadow-lg shadow-[#00CC00]/20"
              >
                Далее
              </button>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                  <div className="text-sm text-red-800">{error}</div>
                </div>
              )}

              {/* Пароль */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Пароль
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
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
                  Подтверждение пароля
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
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
                  Я согласен/на с{' '}
                  <a href="#" className="text-[#00CC00] hover:underline">
                    правилами платформы
                  </a>
                </label>
              </div>

              {/* Кнопки */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Назад
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3.5 bg-[#00CC00] text-white rounded-xl font-semibold hover:bg-[#00b300] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#00CC00]/20"
                >
                  {loading ? 'Регистрация...' : 'Зарегистрироваться'}
                </button>
              </div>

              <p className="text-xs text-center text-gray-500 bg-blue-50 rounded-lg p-3">
                ℹ️ После регистрации аккаунт будет проверен администраторами в течение 1-3 дней. Уведомление придёт на email.
              </p>
            </form>
          )}

          {/* Ссылка на вход */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              У вас уже есть аккаунт?{' '}
              <Link href="/login" className="text-[#00CC00] font-semibold hover:underline">
                Войти
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
