'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
  });

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
      } catch (error) {
        router.push('/admin/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
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
    <div className="min-h-screen bg-gray-50">
      {/* Навигация */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#00CC00] to-[#00b300] rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-gray-900">Админ-панель</span>
              </div>

              <div className="hidden md:flex space-x-1">
                <a href="/admin/dashboard" className="px-4 py-2 text-sm font-medium text-[#00CC00] bg-[#00CC00]/10 rounded-lg">
                  {t.nav.dashboard}
                </a>
                <a href="/admin/users" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                  {t.nav.users}
                </a>
                <a href="/admin/projects" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                  {t.nav.projects}
                </a>
                <a href="/admin/verifications" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                  {t.nav.verifications}
                </a>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                {t.nav.logout}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Контент */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Приветствие */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t.welcome}, {user?.firstName}!
          </h1>
          <p className="text-gray-600">{t.title}</p>
        </div>

        {/* Статистика */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {t.statistics.title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{statistics.totalUsers}</p>
              <p className="text-sm text-gray-600">{t.statistics.totalUsers}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{statistics.totalVolunteers}</p>
              <p className="text-sm text-gray-600">{t.statistics.totalVolunteers}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{statistics.totalOrganizers}</p>
              <p className="text-sm text-gray-600">{t.statistics.totalOrganizers}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 bg-[#00CC00]/10 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{statistics.activeProjects}</p>
              <p className="text-sm text-gray-600">{t.statistics.activeProjects}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{statistics.pendingVerifications}</p>
              <p className="text-sm text-gray-600">{t.statistics.pendingVerifications}</p>
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
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
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
              href="/admin/verifications"
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
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
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-gray-500 text-center py-8">
              {t.recentActivity.noActivity}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
