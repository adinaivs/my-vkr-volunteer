'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '../components/AdminSidebar';
import AdminNav from '../components/AdminNav';
import DynamicContent from '@/app/components/DynamicContent';
import { SidebarProvider } from '@/app/contexts/SidebarContext';
import { useToast } from '@/app/components/ToastContainer';

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
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [organizers, setOrganizers] = useState<OrganizerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedOrganizer, setSelectedOrganizer] = useState<OrganizerProfile | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  
  // Новые состояния для фильтрации и отображения
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'name-desc'>('date-desc');
  const [showFilters, setShowFilters] = useState(false);

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
    toast.confirm(
      'Вы уверены, что хотите подтвердить этого организатора?',
      async () => {
        try {
          setActionLoading(true);
          const response = await fetch(`/api/admin/organizers/${userId}/approve`, {
            method: 'POST',
          });

          if (response.ok) {
            toast.success('Организатор успешно подтвержден!');
            fetchOrganizers();
            setSelectedOrganizer(null);
          } else {
            const data = await response.json();
            toast.error(data.error || 'Ошибка при подтверждении');
          }
        } catch (error) {
          console.error('Error approving organizer:', error);
          toast.error('Ошибка при подтверждении организатора');
        } finally {
          setActionLoading(false);
        }
      },
      'info'
    );
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

  // Функция фильтрации и сортировки организаторов
  const getFilteredAndSortedOrganizers = () => {
    let filtered = [...organizers];

    // Фильтр по поисковому запросу
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(organizer => 
        organizer.organizationName.toLowerCase().includes(query) ||
        organizer.user.firstName.toLowerCase().includes(query) ||
        organizer.user.lastName.toLowerCase().includes(query) ||
        organizer.user.email.toLowerCase().includes(query) ||
        organizer.user.phone.toLowerCase().includes(query) ||
        organizer.inn.toLowerCase().includes(query) ||
        organizer.okpo.toLowerCase().includes(query)
      );
    }

    // Сортировка
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.user.createdAt).getTime() - new Date(a.user.createdAt).getTime();
        case 'date-asc':
          return new Date(a.user.createdAt).getTime() - new Date(b.user.createdAt).getTime();
        case 'name-asc':
          return a.organizationName.localeCompare(b.organizationName);
        case 'name-desc':
          return b.organizationName.localeCompare(a.organizationName);
        default:
          return 0;
      }
    });

    return filtered;
  };

  // Функция сброса всех фильтров
  const resetFilters = () => {
    setSearchQuery('');
    setSortBy('date-desc');
    setFilter('pending');
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
    <SidebarProvider>
      <div className="min-h-screen bg-green-50">
        {currentUser && (
          <>
            <AdminNav user={currentUser} />
            <AdminSidebar user={currentUser} />
          </>
        )}

        <DynamicContent>
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

          {/* Единый контейнер для поиска и фильтров */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-300 mb-6 p-6">
            {/* Верхняя панель: Поиск + Кнопки отображения + Сброс */}
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              {/* Поисковая строка */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Поиск по названию, ФИО, email, телефону, ИНН, ОКПО..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                />
                <svg 
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Кнопка сброса фильтров */}
              <button
                onClick={resetFilters}
                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-200 transition-colors flex items-center gap-2"
                title="Сбросить фильтры"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">Сбросить</span>
              </button>
            </div>

            {/* Разделитель */}
            <div className="border-t border-gray-100 my-4"></div>

            {/* Кнопка показать/скрыть фильтры */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-between text-sm font-medium rounded-lg"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span>{showFilters ? 'Скрыть фильтры' : 'Показать фильтры'}</span>
              </div>
              <svg 
                className={`w-5 h-5 transition-transform ${showFilters ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Панель фильтров */}
            {showFilters && (
              <div className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Фильтр по статусу */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Статус
                    </label>
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value as any)}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent text-sm"
                    >
                      <option value="pending">Ожидают проверки</option>
                      <option value="approved">Подтвержденные</option>
                      <option value="rejected">Отклоненные</option>
                      <option value="all">Все</option>
                    </select>
                  </div>

                  {/* Сортировка */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Сортировка
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent text-sm"
                    >
                      <option value="date-desc">Дата регистрации: сначала новые</option>
                      <option value="date-asc">Дата регистрации: сначала старые</option>
                      <option value="name-asc">Название: А-Я</option>
                      <option value="name-desc">Название: Я-А</option>
                    </select>
                  </div>

                  {/* Информация о количестве */}
                  <div className="flex items-end">
                    <div className="w-full px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-900">
                        <span className="font-bold">{getFilteredAndSortedOrganizers().length}</span> из <span className="font-bold">{organizers.length}</span> организаторов
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Organizers List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00] mx-auto"></div>
            </div>
          ) : getFilteredAndSortedOrganizers().length === 0 ? (
            <div className="bg-white rounded-xl shadow-xl border border-gray-300 p-12 text-center">
              <p className="text-gray-500">
                {searchQuery ? 'Организаторы не найдены. Попробуйте изменить параметры поиска.' : 'Нет организаторов для отображения'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {getFilteredAndSortedOrganizers().map((organizer) => (
                <div
                  key={organizer.id}
                  className="bg-white rounded-xl shadow-xl border border-gray-300 p-6 hover:shadow-2xl transition-shadow"
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
                          Подтвердить
                        </button>
                        <button
                          onClick={() => setSelectedOrganizer(organizer)}
                          disabled={actionLoading}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                          Отклонить
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
                          Подтвердить
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DynamicContent>

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
    </SidebarProvider>
  );
}
