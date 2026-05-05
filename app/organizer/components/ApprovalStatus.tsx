'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ApprovalStatusProps {
  isApproved: boolean;
  isRejected: boolean;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
}

export default function ApprovalStatus({ 
  isApproved, 
  isRejected,
  approvedAt,
  rejectedAt,
  rejectionReason 
}: ApprovalStatusProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Генерируем уникальный ключ для каждого статуса
  const getStorageKey = () => {
    if (isApproved) return `approval-status-approved-${approvedAt}`;
    if (isRejected) return `approval-status-rejected-${rejectedAt}`;
    return 'approval-status-pending';
  };

  // Проверяем localStorage при монтировании компонента
  useEffect(() => {
    const storageKey = getStorageKey();
    const isDismissed = localStorage.getItem(storageKey);
    if (isDismissed === 'true') {
      setIsVisible(false);
    }
  }, [isApproved, isRejected, approvedAt, rejectedAt]);

  // Обработчик закрытия с сохранением в localStorage
  const handleDismiss = () => {
    const storageKey = getStorageKey();
    localStorage.setItem(storageKey, 'true');
    setIsVisible(false);
  };

  // Если сообщение закрыто, не показываем ничего
  if (!isVisible) {
    return null;
  }
  // Статус: Подтвержден
  if (isApproved) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-green-900 font-semibold mb-1">
              Ваш аккаунт подтвержден
            </h3>
            <p className="text-green-700 text-sm">
              Вы можете создавать и публиковать проекты
            </p>
            {approvedAt && (
              <p className="text-green-600 text-xs mt-1">
                Подтверждено: {new Date(approvedAt).toLocaleDateString('ru-RU')}
              </p>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="text-green-400 hover:text-green-600 transition-colors flex-shrink-0"
            aria-label="Закрыть"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Статус: Отклонен
  if (isRejected) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-red-900 font-semibold mb-1">
              Ваша заявка отклонена
            </h3>
            {rejectionReason && (
              <div className="bg-red-100 rounded-lg p-3 mb-3 mt-2">
                <p className="text-sm font-medium text-red-900 mb-1">Причина отклонения:</p>
                <p className="text-sm text-red-800">{rejectionReason}</p>
              </div>
            )}
            {rejectedAt && (
              <p className="text-red-600 text-xs mb-3">
                Отклонено: {new Date(rejectedAt).toLocaleDateString('ru-RU')}
              </p>
            )}
            <p className="text-red-700 text-sm mb-3">
              Вы можете исправить данные и отправить заявку повторно.
            </p>
            <Link 
              href="/organizer/profile/edit"
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Редактировать данные
            </Link>
          </div>
          <button
            onClick={handleDismiss}
            className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
            aria-label="Закрыть"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Статус: На проверке
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-orange-900 font-semibold mb-1">
            Ваш аккаунт на проверке
          </h3>
          <p className="text-orange-700 text-sm mb-2">
            Администратор проверяет ваши данные. Обычно это занимает 1-2 рабочих дня.
          </p>
          <p className="text-orange-600 text-sm">
            После подтверждения вы сможете создавать и публиковать проекты.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-orange-400 hover:text-orange-600 transition-colors flex-shrink-0"
          aria-label="Закрыть"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
