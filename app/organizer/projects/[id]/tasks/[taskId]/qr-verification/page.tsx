'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';

interface QRCodeData {
  qrCode: string;
  token: string;
  expiresAt: string;
  task: {
    id: string;
    title: string;
  };
}

export default function TaskQRVerificationPage() {
  const params = useParams();
  const router = useRouter();
  const [qrData, setQrData] = useState<QRCodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const fetchQRCode = async () => {
      try {
        const response = await fetch(
          `/api/organizer/projects/${params.id}/tasks/${params.taskId}/qr-code`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Ошибка при загрузке QR-кода');
        }

        const data = await response.json();
        setQrData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      } finally {
        setLoading(false);
      }
    };

    fetchQRCode();
  }, [params.id, params.taskId]);

  useEffect(() => {
    if (!qrData) return;

    const updateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(qrData.expiresAt).getTime();
      const difference = expiry - now;

      if (difference <= 0) {
        setTimeLeft('Истек');
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft(`${hours}ч ${minutes}м ${seconds}с`);
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [qrData]);

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    window.location.reload();
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Генерация QR-кода...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Ошибка</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.back()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Вернуться назад
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!qrData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Заголовок */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              QR-код для подтверждения задачи
            </h1>
            <p className="text-gray-600">{qrData.task.title}</p>
          </div>

          {/* QR-код */}
          <div className="flex justify-center mb-8">
            <div className="bg-white p-6 rounded-lg border-4 border-blue-600 shadow-xl">
              <Image
                src={qrData.qrCode}
                alt="QR код для верификации задачи"
                width={400}
                height={400}
                className="w-full h-auto"
              />
            </div>
          </div>

          {/* Информация */}
          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Инструкция:</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Покажите этот QR-код волонтеру</li>
              <li>Волонтер должен отсканировать код в своем приложении</li>
              <li>После сканирования задача будет отмечена как выполненная</li>
            </ol>
          </div>

          {/* Время действия */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <span className="font-medium">Код действителен:</span> {timeLeft}
                </p>
              </div>
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="flex gap-4 print:hidden">
            <button
              onClick={handleRefresh}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Обновить код
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition font-medium"
            >
              Распечатать
            </button>
            <button
              onClick={() => router.back()}
              className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition font-medium"
            >
              Назад
            </button>
          </div>

          {/* Информация о токене (только для отладки) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-4 bg-gray-100 rounded text-xs text-gray-600 break-all print:hidden">
              <p className="font-mono">Token: {qrData.token}</p>
              <p className="font-mono mt-1">Expires: {qrData.expiresAt}</p>
            </div>
          )}
        </div>
      </div>

      {/* Стили для печати */}
      <style jsx global>{`
        @media print {
          body {
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
