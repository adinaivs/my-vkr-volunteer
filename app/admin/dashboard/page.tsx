'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '../components/AdminSidebar';
import AdminNav from '../components/AdminNav';
import DynamicContent from '@/app/components/DynamicContent';
import { SidebarProvider } from '@/app/contexts/SidebarContext';

// Переводы
const translations = {
  ru: {
    welcome: 'Добро пожаловать',
    title: 'Панель администратора',
    statistics: {
      title: 'Статистика',
      totalUsers: 'Всего пользователей',
      activeProjects: 'Активных проектов',
      pendingVerifications: 'Ожидают проверки',
      totalVolunteers: 'Волонтеров',
      totalOrganizers: 'Организаторов',
    },
    recentActivity: {
      title: 'Последняя активность',
      noActivity: 'Нет активности',
    },
    quickActions: {
      title: 'Быстрые действия',
      manageUsers: 'Управление пользователями',
      verifyOrganizers: 'Проверка организаторов',
      manageProjects: 'Управление проектами',
    },
    nav: {
      dashboard: 'Главная',
      users: 'Пользователи',
      projects: 'Проекты',
      verifications: 'Проверки',
      logout: 'Выйти',
    },
  },
  kg: {
    welcome: 'Кош келиңиз',
    title: 'Администратор панели',
    statistics: {
      title: 'Статистика',
      totalUsers: 'Бардык колдонуучулар',
      activeProjects: 'Активдүү долбоорлор',
      pendingVerifications: 'Текшерүүнү күтүүдө',
      totalVolunteers: 'Ыктыярчылар',
      totalOrganizers: 'Уюштуруучулар',
    },
    recentActivity: {
      title: 'Акыркы активдүүлүк',
      noActivity: 'Активдүүлүк жок',
    },
    quickActions: {
      title: 'Тез аракеттер',
      manageUsers: 'Колдонуучуларды башкаруу',
      verifyOrganizers: 'Уюштуруучуларды текшерүү',
      manageProjects: 'Долбоорлорду башкаруу',
    },
    nav: {
      dashboard: 'Башкы',
      users: 'Колдонуучулар',
      projects: 'Долбоорлор',
      verifications: 'Текшерүүлөр',
      logout: 'Чыгуу',
    },
  },
};

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface Statistics {
  totalUsers: number;
  totalVolunteers: number;
  totalOrganizers: number;
  activeProjects: number;
  pendingVerifications: number;
  pendingOrganizerApprovals: number;
}

interface FreePostsSetting {
  defaultFreePosts: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [locale, setLocale] = useState<'ru' | 'kg'>('ru');
  const t = translations[locale];
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<Statistics>({
    totalUsers: 0,
    totalVolunteers: 0,
    totalOrganizers: 0,
    activeProjects: 0,
    pendingVerifications: 0,
    pendingOrganizerApprovals: 0,
  });
  const [freePostsSetting, setFreePostsSetting] = useState<number>(3);
  const [editingFreePosts, setEditingFreePosts] = useState(false);
  const [tempFreePosts, setTempFreePosts] = useState<number>(3);
  const [savingFreePosts, setSavingFreePosts] = useState(false);

  useEffect(() => {
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

        setUser(data.user);
        
        // Загружаем статистику
        const statsResponse = await fetch('/api/admin/statistics');
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStatistics(statsData);
        }

        // Загружаем настройку бесплатных публикаций
        const freePostsResponse = await fetch('/api/admin/settings/free-posts');
        if (freePostsResponse.ok) {
          const freePostsData = await freePostsResponse.json();
          setFreePostsSetting(freePostsData.defaultFreePosts);
          setTempFreePosts(freePostsData.defaultFreePosts);
        }
      } catch (error) {
        router.push('/admin/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleSaveFreePosts = async () => {
    if (tempFreePosts < 0) {
      alert('Количество бесплатных публикаций не может быть отрицательным');
      return;
    }

    setSavingFreePosts(true);
    try {
      const response = await fetch('/api/admin/settings/free-posts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ defaultFreePosts: tempFreePosts }),
      });

      if (response.ok) {
        const data = await response.json();
        setFreePostsSetting(data.defaultFreePosts);
        setEditingFreePosts(false);
        alert('Настройка успешно сохранена');
      } else {
        const error = await response.json();
        alert(error.error || 'Ошибка при сохранении настройки');
      }
    } catch (error) {
      console.error('Error saving free posts setting:', error);
      alert('Ошибка при сохранении настройки');
    } finally {
      setSavingFreePosts(false);
    }
  };

  const handleCancelEdit = () => {
    setTempFreePosts(freePostsSetting);
    setEditingFreePosts(false);
  };

  if (loading) {
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
        {user && (
          <>
            <AdminNav user={user} />
            <AdminSidebar user={user} />
          </>
        )}

        {/* Контент */}
        <DynamicContent>
        {/* Приветствие */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t.welcome}, {user?.firstName}!
          </h1>
          <p className="text-gray-600">{t.title}</p>
        </div>

        {/* Настройка бесплатных публикаций */}
        <div className="mb-8">
          <div className="bg-gradient-to-br from-[#00CC00] to-emerald-500 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-2">Бесплатные публикации для организаторов</h2>
                <p className="text-emerald-50 text-sm mb-4">
                  Установите количество бесплатных публикаций, которое получает каждый новый организатор
                </p>
                
                {!editingFreePosts ? (
                  <div className="flex items-center space-x-4">
                    <div className="bg-white/20 rounded-xl px-6 py-3 backdrop-blur-sm">
                      <span className="text-3xl font-bold">{freePostsSetting}</span>
                      <span className="text-sm ml-2">публикаций</span>
                    </div>
                    <button
                      onClick={() => setEditingFreePosts(true)}
                      className="bg-white text-[#00CC00] px-6 py-3 rounded-xl font-medium hover:bg-emerald-50 transition-colors flex items-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Изменить</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-4">
                    <div className="bg-white/20 rounded-xl px-4 py-2 backdrop-blur-sm">
                      <input
                        type="number"
                        min="0"
                        value={tempFreePosts}
                        onChange={(e) => setTempFreePosts(parseInt(e.target.value) || 0)}
                        className="bg-transparent text-white text-2xl font-bold w-24 outline-none"
                        disabled={savingFreePosts}
                      />
                    </div>
                    <button
                      onClick={handleSaveFreePosts}
                      disabled={savingFreePosts}
                      className="bg-white text-[#00CC00] px-6 py-3 rounded-xl font-medium hover:bg-emerald-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {savingFreePosts ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#00CC00]"></div>
                          <span>Сохранение...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Сохранить</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={savingFreePosts}
                      className="bg-white/20 text-white px-6 py-3 rounded-xl font-medium hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Отмена
                    </button>
                  </div>
                )}
              </div>
              <div className="hidden lg:block">
                <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Статистика */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {t.statistics.title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl shadow-xl border border-gray-300 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{statistics.totalUsers}</p>
                  <p className="text-xs text-gray-600">{t.statistics.totalUsers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{statistics.totalVolunteers}</p>
                  <p className="text-xs text-gray-600">{t.statistics.totalVolunteers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{statistics.totalOrganizers}</p>
                  <p className="text-xs text-gray-600">{t.statistics.totalOrganizers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#00CC00]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{statistics.activeProjects}</p>
                  <p className="text-xs text-gray-600">{t.statistics.activeProjects}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{statistics.pendingOrganizerApprovals}</p>
                  <p className="text-xs text-gray-600">Организаторов на проверке</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Быстрые действия */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {t.quickActions.title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <a
              href="/admin/users"
              className="bg-white rounded-xl shadow-xl border border-gray-300 p-6 hover:shadow-2xl transition-shadow"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t.quickActions.manageUsers}</h3>
                </div>
              </div>
            </a>

            <a
              href="/admin/organizers"
              className="bg-white rounded-xl shadow-xl border border-gray-300 p-6 hover:shadow-2xl transition-shadow"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t.quickActions.verifyOrganizers}</h3>
                </div>
              </div>
            </a>

            <a
              href="/admin/projects"
              className="bg-white rounded-xl shadow-xl border border-gray-300 p-6 hover:shadow-2xl transition-shadow"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-[#00CC00]/10 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t.quickActions.manageProjects}</h3>
                </div>
              </div>
            </a>
          </div>
        </div>

        {/* Последняя активность */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {t.recentActivity.title}
          </h2>
          <div className="bg-white rounded-xl shadow-xl border border-gray-300 p-6">
            <p className="text-gray-500 text-center py-8">
              {t.recentActivity.noActivity}
            </p>
          </div>
        </div>
      </DynamicContent>
    </div>
    </SidebarProvider>
  );
}
