'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from '@/app/i18n';

function VerifyResetCodeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, isLoading: translationsLoading } = useTranslation('auth');
  const email = searchParams.get('email');

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email) {
      router.push('/forgot-password');
    }
  }, [email, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || t.verifyCode?.errors?.verifyError || 'Ошибка при проверке кода');
        setLoading(false);
        return;
      }

      router.push(`/forgot-password/reset?email=${encodeURIComponent(email!)}&code=${code}`);
    } catch (err) {
      setError(t.verifyCode?.errors?.verifyError || 'Ошибка при проверке кода');
      setLoading(false);
    }
  };

  if (!email || translationsLoading) {
    return null;
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
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-[#00CC00]/10 mb-4">
              <svg className="w-8 h-8 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {t.verifyCode?.title || 'Введите код подтверждения'}
            </h2>
            <p className="text-sm text-gray-600">
              {t.verifyCode?.subtitle || 'Мы отправили код на'}
            </p>
            <p className="text-sm font-semibold text-[#00CC00] mt-1">
              {email}
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}

            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                {t.verifyCode?.code || 'Код подтверждения'}
              </label>
              <input
                id="code"
                name="code"
                type="text"
                required
                maxLength={6}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent transition-all text-center text-2xl font-bold tracking-widest"
                placeholder={t.verifyCode?.codePlaceholder || '000000'}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
              <p className="mt-2 text-xs text-gray-500 text-center">
                Введите 6-значный код из письма
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full py-3.5 bg-[#00CC00] text-white rounded-xl font-semibold hover:bg-[#00b300] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#00CC00]/20"
            >
              {loading ? (t.verifyCode?.verifying || 'Проверка...') : (t.verifyCode?.verify || 'Подтвердить')}
            </button>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Не получили код?{' '}
                <button
                  type="button"
                  className="text-[#00CC00] font-semibold hover:underline"
                  onClick={() => router.push('/forgot-password')}
                >
                  {t.verifyCode?.resendCode || 'Отправить снова'}
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function VerifyResetCodePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00] mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    }>
      <VerifyResetCodeForm />
    </Suspense>
  );
}
