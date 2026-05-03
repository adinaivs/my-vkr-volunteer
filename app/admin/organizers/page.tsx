'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '../components/AdminSidebar';
import AdminNav from '../components/AdminNav';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  createdAt: string;
  status: string;
}

interface OrganizerProfile {
  id: string;
  organizationName: string;
  inn: string;
  okpo: string;
  legalAddress: string;
  actualAddress: string;
  verificationDocUrl?: string | null;
  verificationComment?: string | null;
  isApprovedByAdmin: boolean;
  approvedAt?: string | null;
  isRejected: boolean;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  user: User;
}

export default function AdminOrganizersPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [organizers, setOrganizers] = useState<OrganizerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedOrganizer, setSelectedOrganizer] = useState<OrganizerProfile | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  console.log('AdminOrganizersPage rendered');
  console.log('Current user:', currentUser);
  console.log('Organizers count:', organizers.length);
  console.log('Filter:', filter);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('Checking admin auth...');
        const response = await fetch('/api/auth/me');
        console.log('Auth response status:', response.status);
        
        if (!response.ok) {
          console.log('Not authenticated, redirecting to login');
          router.push('/admin/login');
          return;
        }

        const data = await response.json();
        console.log('User data:', data.user);
        
        if (data.user.role !== 'admin') {
          console.log('User is not admin, redirecting to home');
          router.push('/');
          return;
        }

        console.log('Admin authenticated successfully');
        setCurrentUser(data.user);
        // НЕ вызываем fetchOrganizers здесь - он вызовется через другой useEffect
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/admin/login');
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    // Загружаем организаторов только после успешной авторизации
    if (currentUser) {
      console.log('User is authenticated, fetching organizers...');
      fetchOrganizers();
    }
  }, [filter, currentUser]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/admin/login');
        return;
      }

      const data = await response.json();
      if (data.user.role !== 'admin') {
        router.push('/');
        return;
      }

      setCurrentUser(data.user);
    } catch (error) {
      router.push('/admin/login');
    }
  };

  const fetchOrganizers = async () => {
    try {
      setLoading(true);
      console.log('Fetching organizers with filter:', filter);
      const response = await fetch(`/api/admin/organizers?status=${filter}`);
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Received data:', data);
        console.log('Number of organizers:', data.organizers?.length || 0);
        setOrganizers(data.organizers);
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
      }
    } catch (error) {
      console.error('Error fetching organizers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    if (!confirm('Вы уверены, что хотите подтвердить этого организатора?')) {
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/organizers/${userId}/approve`, {
        method: 'POST',
      });

      if (response.ok) {
        alert('Организатор успешно подтвержден!');
        fetchOrganizers();
        setSelectedOrganizer(null);
      } else {
        const data = await response.json();
        alert(data.error || 'Ошибка при подтверждении');
      }
    } catch (error) {
      console.error('Error approving organizer:', error);
      alert('Ошибка при подтверждении организатора');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (userId: string) => {
    if (!rejectReason.trim()) {
      alert('Пожалуйста, укажите причину отклонения');
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/organizers/${userId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });

      if (response.ok) {
        alert('Организатор отклонен');
        fetchOrganizers();
        setSelectedOrganizer(null);
        setRejectReason('');
      } else {
        const data = await response.json();
        alert(data.error || 'Ошибка при отклонении');
      }
    } catch (error) {
      console.error('Error rejecting organizer:', error);
      alert('Ошибка при отклонении организатора');
    } finally {
      setActionLoading(false);
    }
  };

  if (!currentUser) {
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
    <div className="min-h-screen bg-gray-50">
      {currentUser && (
        <>
          <AdminNav user={currentUser} />
          <AdminSidebar user={currentUser} />
        </>
      )}

      <main className="lg:ml-[272px] px-4 sm:px-6 lg:px-8 pt-20 lg:pt-[88px] pb-20 lg:pb-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Проверка организаторов
            </h1>
            <p className="text-gray-600">
              Управление заявками на регистрацию организаторов
            </p>
          </div>

          {/* Filters */}
          <div className="mb-6 flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'pending'
                  ? 'bg-[#00CC00] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              Ожидают проверки
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'approved'
                  ? 'bg-[#00CC00] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              Подтвержденные
            </button>
            <button
              onClick={() => setFilter('rejected')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'rejected'
                  ? 'bg-[#00CC00] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              Отклоненные
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-[#00CC00] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              Все
            </button>
          </div>

          {/* Organizers List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00] mx-auto"></div>
            </div>
          ) : organizers.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">Нет организаторов для отображения</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {organizers.map((organizer) => (
                <div
                  key={organizer.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {organizer.organizationName}
                        </h3>
                        {organizer.isRejected ? (
                          <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Отклонен
                          </span>
                        ) : organizer.isApprovedByAdmin ? (
                          <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Подтвержден
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-orange-100 text-orange-700 text-sm font-medium rounded-full flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Ожидает проверки
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-500">Контактное лицо</p>
                          <p className="font-medium text-gray-900">
                            {organizer.user.firstName} {organizer.user.lastName}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Email</p>
                          <p className="font-medium text-gray-900">{organizer.user.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Телефон</p>
                          <p className="font-medium text-gray-900">{organizer.user.phone}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Город</p>
                          <p className="font-medium text-gray-900">{organizer.user.city}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">ИНН</p>
                          <p className="font-medium text-gray-900">{organizer.inn}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">ОКПО</p>
                          <p className="font-medium text-gray-900">{organizer.okpo}</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm text-gray-500 mb-1">Юридический адрес</p>
                        <p className="text-gray-900">{organizer.legalAddress}</p>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm text-gray-500 mb-1">Фактический адрес</p>
                        <p className="text-gray-900">{organizer.actualAddress}</p>
                      </div>

                      {/* Причина отклонения */}
                      {organizer.isRejected && organizer.rejectionReason && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-red-900 mb-1">
                                Причина отклонения
                              </p>
                              <p className="text-sm text-red-700">
                                {organizer.rejectionReason}
                              </p>
                              {organizer.rejectedAt && (
                                <p className="text-xs text-red-600 mt-2">
                                  Отклонено: {new Date(organizer.rejectedAt).toLocaleString('ru-RU')}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Документ о регистрации */}
                      {organizer.verificationDocUrl ? (
                        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-blue-900 mb-1">
                                Документ о регистрации
                              </p>
                              <a
                                href={organizer.verificationDocUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium inline-flex items-center gap-1"
                              >
                                Открыть документ
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-700">
                                Документ о регистрации не загружен
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {!organizer.isApprovedByAdmin && !organizer.isRejected && (
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleApprove(organizer.user.id)}
                          disabled={actionLoading}
                          className="px-4 py-2 bg-[#00CC00] text-white rounded-lg hover:bg-[#00b300] transition-colors disabled:opacity-50"
                        >
                          ✓ Подтвердить
                        </button>
                        <button
                          onClick={() => setSelectedOrganizer(organizer)}
                          disabled={actionLoading}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                          ✗ Отклонить
                        </button>
                      </div>
                    )}

                    {organizer.isRejected && (
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleApprove(organizer.user.id)}
                          disabled={actionLoading}
                          className="px-4 py-2 bg-[#00CC00] text-white rounded-lg hover:bg-[#00b300] transition-colors disabled:opacity-50"
                        >
                          ✓ Подтвердить
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Reject Modal */}
      {selectedOrganizer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Отклонить организатора
            </h3>
            <p className="text-gray-600 mb-4">
              Укажите причину отклонения заявки организатора{' '}
              <strong>{selectedOrganizer.organizationName}</strong>
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Причина отклонения..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00CC00] focus:border-transparent resize-none"
              rows={4}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => handleReject(selectedOrganizer.user.id)}
                disabled={actionLoading || !rejectReason.trim()}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                Отклонить
              </button>
              <button
                onClick={() => {
                  setSelectedOrganizer(null);
                  setRejectReason('');
                }}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
