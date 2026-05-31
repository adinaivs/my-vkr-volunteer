'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import VolunteerNav from '../components/VolunteerNav';
import VolunteerSidebar from '../components/VolunteerSidebar';
import AiSupportButton from '@/app/components/AiSupportButton';
import DynamicContent from '@/app/components/DynamicContent';
import { SidebarProvider } from '@/app/contexts/SidebarContext';
import { useTranslation } from '@/app/i18n/useTranslation';
import CustomSelect from '@/app/components/CustomSelect';
import { SvgIcon } from '@/app/components/SvgIcon';
import { Tooltip } from '@/app/components/Tooltip';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

interface Skill {
  id: string;
  name: string;
}

interface TaskAssignment {
  id: string;
  status: string;
  assignedAt: string;
  completedAt?: string;
  confirmedAt?: string;
  feedback?: string;
  rating?: number;
}

interface MyTask {
  id: string;
  title: string;
  description: string;
  deadline: string;
  status: string;
  requiredVolunteers: number;
  currentVolunteers: number;
  skill?: Skill;
  assignmentStatus: string;
  assignedAt: string;
  assignments: TaskAssignment[];
  projectStatus?: string; // Добавляем статус проекта
}

interface Project {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  location: string;
  startDate: string;
  endDate: string;
  status: string;
  maxVolunteers: number;
  currentVolunteers: number;
  myTasksCount: number;
  completedTasksCount: number;
  category: {
    id: string;
    slug: string;
    icon: string;
    name: string;
  };
  organizer: {
    id: string;
    firstName: string;
    lastName: string;
    organizerProfile?: {
      organizationName: string;
    };
  };
  myTasks: MyTask[];
}

interface Application {
  id: string;
  status: string;
  message?: string;
  appliedAt: string;
  rejectionReason?: string;
  project: {
    id: string;
    title: string;
    description: string;
    imageUrl?: string;
    location: string;
    startDate: string;
    endDate: string;
    status: string;
    category: {
      id: string;
      slug: string;
      icon: string;
      name: string;
    };
    organizer: {
      id: string;
      firstName: string;
      lastName: string;
      organizerProfile?: {
        organizationName: string;
      };
    };
  };
}

export default function MyProjects() {
  const router = useRouter();
  const { t, locale } = useTranslation('volunteer');

  const formatDate = (iso: string, opts?: Intl.DateTimeFormatOptions) =>
    new Date(iso).toLocaleDateString(locale === 'kg' ? 'ky-KG' : 'ru-RU', opts);

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; key: keyof typeof t.myProjects }> = {
      recruiting: { bg: 'bg-green-100',  text: 'text-green-700',  key: 'statusRecruiting' },
      upcoming:   { bg: 'bg-blue-100',   text: 'text-blue-700',   key: 'statusUpcoming' },
      active:     { bg: 'bg-purple-100', text: 'text-purple-700', key: 'statusActive' },
      completed:  { bg: 'bg-gray-100',   text: 'text-gray-700',   key: 'statusCompleted' },
      cancelled:  { bg: 'bg-red-100',    text: 'text-red-700',    key: 'statusCancelled' },
    };
    const entry = map[status];
    return entry
      ? { bg: entry.bg, text: entry.text, label: (t.myProjects as any)?.[entry.key] || status }
      : { bg: 'bg-gray-100', text: 'text-gray-700', label: t.myProjects?.statusUnknown || 'Неизвестно' };
  };

  const getApplicationStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; key: string }> = {
      pending:  { bg: 'bg-yellow-100', text: 'text-yellow-700', key: 'appStatusPending' },
      approved: { bg: 'bg-green-100',  text: 'text-green-700',  key: 'appStatusApproved' },
      rejected: { bg: 'bg-red-100',    text: 'text-red-700',    key: 'appStatusRejected' },
    };
    const entry = map[status];
    return entry
      ? { bg: entry.bg, text: entry.text, label: (t.myProjects as any)?.[entry.key] || status }
      : { bg: 'bg-gray-100', text: 'text-gray-700', label: t.myProjects?.statusUnknown || 'Неизвестно' };
  };

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'applications'>('active');

  const [projects, setProjects] = useState<Project[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'name-desc'>('date-desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) { router.push('/login'); return; }
        const data = await response.json();
        if (data.user.role !== 'volunteer') { router.push('/dashboard'); return; }
        setUser(data.user);
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (user) {
      if (activeTab === 'applications') fetchApplications();
      else fetchProjects();
    }
  }, [user, activeTab]);

  // Перезагружаем при смене языка
  useEffect(() => {
    if (!user) return;
    if (activeTab === 'applications') fetchApplications();
    else fetchProjects();
  }, [locale]);

  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      const type = activeTab === 'active' ? 'active' : 'completed';
      const response = await fetch(`/api/volunteer/my-projects?type=${type}&locale=${locale}`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchApplications = async () => {
    try {
      setLoadingApplications(true);
      const response = await fetch(`/api/volunteer/applications?locale=${locale}`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications || []);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoadingApplications(false);
    }
  };

  const handleProjectClick = (project: Project) => {
    router.push(`/volunteer/my-projects/${project.id}`);
  };

  const filteredProjects = projects
    .filter(p => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        (p.organizer.organizerProfile?.organizationName || '').toLowerCase().includes(q) ||
        `${p.organizer.firstName} ${p.organizer.lastName}`.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date-asc': return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        case 'name-asc': return a.title.localeCompare(b.title);
        case 'name-desc': return b.title.localeCompare(a.title);
        default: return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      }
    });

  const filteredApplications = applications
    .filter(app => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        app.project.title.toLowerCase().includes(q) ||
        app.project.location.toLowerCase().includes(q) ||
        (app.project.organizer.organizerProfile?.organizationName || '').toLowerCase().includes(q) ||
        `${app.project.organizer.firstName} ${app.project.organizer.lastName}`.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date-asc': return new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime();
        case 'name-asc': return a.project.title.localeCompare(b.project.title);
        case 'name-desc': return b.project.title.localeCompare(a.project.title);
        default: return new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime();
      }
    });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00] mx-auto"></div>
          <p className="mt-4 text-gray-600">{t.common?.loading || 'Загрузка...'}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50">
        <VolunteerSidebar user={user} />
        <VolunteerNav user={user} />

        <DynamicContent>
          {/* Page Header */}
          <div className="mb-5 sm:mb-8">
            <h1 className="text-xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">{t.myProjects?.title || 'Мои проекты'}</h1>
            <p className="text-sm sm:text-base text-gray-600">{t.myProjects?.subtitle || 'Управляйте своими проектами и заявками'}</p>
          </div>

          {/* Единый контейнер для поиска и фильтров */}
          <div className="bg-white rounded-xl shadow-xl border border-gray-300 mb-3 sm:mb-4 md:mb-6 p-2.5 sm:p-3 md:p-4">
            {/* Верхняя панель: Поиск + Кнопки */}
            <div className="flex gap-1.5 sm:gap-2 mb-2.5 sm:mb-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder={t.myProjects?.searchPlaceholder || 'Поиск проектов...'}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 sm:pl-9 pr-2 sm:pr-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00CC00] focus:border-transparent"
                />
                <svg className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {activeTab !== 'applications' && (
                <Tooltip text={viewMode === 'grid' ? 'Список' : 'Блоки'}>
                  <button
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    className="p-1.5 sm:p-2 rounded-lg border bg-[#00CC00] text-white border-[#00CC00] transition-colors hover:bg-[#00b300] flex-shrink-0"
                  >
                    {viewMode === 'list' ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                    )}
                  </button>
                </Tooltip>
              )}
              {(searchQuery || sortBy !== 'date-desc') && (
                <Tooltip text="Сбросить">
                  <button
                    onClick={() => { setSearchQuery(''); setSortBy('date-desc'); }}
                    className="p-1.5 sm:p-2 bg-gray-100 text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-200 transition-colors flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </Tooltip>
              )}
            </div>

            {/* Разделитель */}
            <div className="border-t border-gray-100 my-2 sm:my-2.5"></div>

            {/* Кнопка показать/скрыть фильтры */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-between text-sm font-medium rounded-lg"
            >
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span className="text-xs sm:text-sm">{showFilters ? (t.projects?.hideFilters || 'Скрыть фильтры') : (t.projects?.showFilters || 'Показать фильтры')}</span>
              </div>
              <svg className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Панель фильтров */}
            {showFilters && (
              <div className="pt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.projects?.sortBy || 'Сортировка'}
                  </label>
                  <CustomSelect
                    className="w-full md:w-64"
                    value={sortBy}
                    onChange={v => setSortBy(v as typeof sortBy)}
                    options={[
                      { value: 'date-desc', label: t.projects?.sortDateDesc || 'Дата: сначала новые' },
                      { value: 'date-asc',  label: t.projects?.sortDateAsc  || 'Дата: сначала старые' },
                      { value: 'name-asc',  label: t.projects?.sortNameAsc  || 'Название: А-Я' },
                      { value: 'name-desc', label: t.projects?.sortNameDesc || 'Название: Я-А' },
                    ]}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-200 mb-4 sm:mb-6">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('active')}
                className={`flex-1 px-1.5 sm:px-4 md:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold transition-colors ${
                  activeTab === 'active'
                    ? 'text-[#00CC00] border-b-2 border-[#00CC00] bg-green-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="text-[10px] sm:text-xs md:text-sm">{t.myProjects?.tabActive || 'Активные'}</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`flex-1 px-1.5 sm:px-4 md:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold transition-colors ${
                  activeTab === 'completed'
                    ? 'text-[#00CC00] border-b-2 border-[#00CC00] bg-green-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="leading-tight text-center text-[10px] sm:text-xs md:text-sm">{t.myProjects?.tabCompleted || 'Завершённые'}</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('applications')}
                className={`flex-1 px-1.5 sm:px-4 md:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold transition-colors ${
                  activeTab === 'applications'
                    ? 'text-[#00CC00] border-b-2 border-[#00CC00] bg-green-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-[10px] sm:text-xs md:text-sm">{t.myProjects?.tabApplications || 'Заявки'}</span>
                </div>
              </button>
            </div>

            <div className="p-3 sm:p-4 md:p-6">
              {/* Active/Completed Projects */}
              {(activeTab === 'active' || activeTab === 'completed') && (
                <>
                  {loadingProjects ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#00CC00] mx-auto"></div>
                      <p className="mt-4 text-gray-600">{t.myProjects?.loadingProjects || 'Загрузка проектов...'}</p>
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {activeTab === 'active' ? (t.myProjects?.noActive || 'У вас пока нет активных проектов') : (t.myProjects?.noCompleted || 'Нет завершённых проектов')}
                      </h3>
                      <p className="text-gray-600 mb-6">
                        {activeTab === 'active'
                          ? (t.myProjects?.noActiveHint || 'Найдите интересный проект и подайте заявку на участие')
                          : (t.myProjects?.noCompletedHint || 'Здесь будут отображаться проекты, которые вы завершили')}
                      </p>
                      {activeTab === 'active' && (
                        <Link
                          href="/volunteer/projects"
                          className="inline-block px-6 py-3 bg-[#00CC00] text-white rounded-xl font-semibold hover:bg-[#00b300] transition-colors shadow-lg"
                        >
                          {t.myProjects?.findProject || t.common?.findProject || 'Найти проект'}
                        </Link>
                      )}
                    </div>
                  ) : filteredProjects.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <p className="text-gray-500">{t.projects?.noProjectsFoundTitle || 'Проекты не найдены'}</p>
                      <button onClick={() => { setSearchQuery(''); setSortBy('date-desc'); }} className="mt-3 text-sm text-[#00CC00] hover:underline">
                        {t.projects?.resetFilters || 'Сбросить фильтры'}
                      </button>
                    </div>
                  ) : viewMode === 'list' ? (
                    <div className="space-y-3">
                      {filteredProjects.map((project) => {
                        const statusBadge = getStatusBadge(project.status);
                        const progress = project.myTasksCount > 0 ? (project.completedTasksCount / project.myTasksCount) * 100 : 0;
                        return (
                          <div key={project.id} onClick={() => handleProjectClick(project)}
                            className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-[#00CC00] transition-all cursor-pointer"
                          >
                            <div className="relative flex-shrink-0">
                              {project.imageUrl ? (
                                <img src={project.imageUrl} alt={project.title} className="w-16 h-16 object-cover rounded-lg" />
                              ) : (
                                <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center text-[#00CC00] overflow-hidden">
                                  <SvgIcon iconKey={project.category.icon} className="w-8 h-8" />
                                </div>
                              )}
                              <span className={`absolute top-1 right-1 px-1.5 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap shadow ${statusBadge.bg} ${statusBadge.text}`}>{statusBadge.label}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className="text-base font-bold text-gray-900 truncate">{project.title}</h3>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span>{project.location}</span>
                                <span>{formatDate(project.startDate)}</span>
                                {project.myTasksCount > 0 && <span>{project.completedTasksCount}/{project.myTasksCount} задач</span>}
                              </div>
                              {project.myTasksCount > 0 && (
                                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                  <div className="bg-[#00CC00] h-1.5 rounded-full" style={{ width: `${progress}%` }} />
                                </div>
                              )}
                            </div>
                            <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                      {filteredProjects.map((project) => {
                        const statusBadge = getStatusBadge(project.status);
                        const progress = project.myTasksCount > 0 
                          ? (project.completedTasksCount / project.myTasksCount) * 100 
                          : 0;

                        return (
                          <div
                            key={project.id}
                            onClick={() => handleProjectClick(project)}
                            className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl hover:border-[#00CC00] transition-all duration-300 group cursor-pointer"
                          >
                            {/* Project Image с бейджем статуса */}
                            <div className="relative">
                              {project.imageUrl ? (
                                <img
                                  src={project.imageUrl}
                                  alt={project.title}
                                  className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-40 bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                                  <svg className="w-16 h-16 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                              <span className={`absolute top-2 right-2 px-2.5 py-1 text-xs font-semibold rounded-full whitespace-nowrap shadow ${statusBadge.bg} ${statusBadge.text}`}>
                                {statusBadge.label}
                              </span>
                            </div>

                            <div className="p-4 sm:p-5">
                              {/* Title */}
                              <div className="mb-2 sm:mb-3">
                                <h3 className="text-base sm:text-lg font-bold text-gray-900 line-clamp-2 group-hover:text-[#00CC00] transition-colors">
                                  {project.title}
                                </h3>
                              </div>

                              {/* Category */}
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-6 h-6 flex items-center justify-center text-[#00CC00] overflow-hidden flex-shrink-0">
                                  <SvgIcon iconKey={project.category.icon} className="w-5 h-5" />
                                </div>
                                <span className="text-sm text-gray-600">{project.category.name}</span>
                              </div>

                              {/* Tasks Progress */}
                              {project.myTasksCount > 0 && (
                                <div className="mb-3">
                                  <div className="flex items-center justify-between text-sm mb-1">
                                    <span className="text-gray-600">{t.myProjects?.myTasksCount || t.myProjects?.myTasks || 'Мои задачи'}</span>
                                    <span className="font-semibold text-gray-900">
                                      {project.completedTasksCount}/{project.myTasksCount}
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-[#00CC00] h-2 rounded-full transition-all"
                                      style={{ width: `${progress}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}

                              {/* Location and Date */}
                              <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  </svg>
                                  <span className="truncate">{project.location}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span>{formatDate(project.startDate)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* Applications */}
              {activeTab === 'applications' && (
                <>
                  {loadingApplications ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#00CC00] mx-auto"></div>
                      <p className="mt-4 text-gray-600">{t.myProjects?.loadingApplications || 'Загрузка заявок...'}</p>
                    </div>
                  ) : applications.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{t.myProjects?.noApplications || 'У вас пока нет заявок'}</h3>
                      <p className="text-gray-600 mb-6">{t.myProjects?.noApplicationsHint || 'Подайте заявку на участие в проекте'}</p>
                      <Link
                        href="/volunteer/projects"
                        className="inline-block px-6 py-3 bg-[#00CC00] text-white rounded-xl font-semibold hover:bg-[#00b300] transition-colors shadow-lg"
                      >
                        {t.myProjects?.findProject || t.common?.findProject || 'Найти проект'}
                      </Link>
                    </div>
                  ) : filteredApplications.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <p className="text-gray-500">{t.projects?.noProjectsFoundTitle || 'Заявки не найдены'}</p>
                      <button onClick={() => { setSearchQuery(''); setSortBy('date-desc'); }} className="mt-3 text-sm text-[#00CC00] hover:underline">
                        {t.projects?.resetFilters || 'Сбросить фильтры'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredApplications.map((application) => {
                        const appStatusBadge = getApplicationStatusBadge(application.status);
                        const projectStatusBadge = getStatusBadge(application.project.status);

                        return (
                          <div
                            key={application.id}
                            className="border border-gray-200 rounded-xl p-3 sm:p-5 hover:border-[#00CC00] hover:shadow-lg transition-all"
                          >
                            <div className="flex items-start gap-3 sm:gap-4">
                              {/* Project Image */}
                              {application.project.imageUrl ? (
                                <img
                                  src={application.project.imageUrl}
                                  alt={application.project.title}
                                  className="w-16 h-16 sm:w-24 sm:h-24 rounded-lg object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}

                              {/* Application Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex-1 min-w-0">
                                    <Link
                                      href={`/volunteer/projects/${application.project.id}`}
                                      className="text-base sm:text-lg font-bold text-gray-900 hover:text-[#00CC00] transition-colors line-clamp-2"
                                    >
                                      {application.project.title}
                                    </Link>
                                    <p className="text-sm text-gray-600 mt-1">
                                      {application.project.organizer.organizerProfile?.organizationName || 
                                       `${application.project.organizer.firstName} ${application.project.organizer.lastName}`}
                                    </p>
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${appStatusBadge.bg} ${appStatusBadge.text}`}>
                                      {appStatusBadge.label}
                                    </span>
                                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${projectStatusBadge.bg} ${projectStatusBadge.text}`}>
                                      {projectStatusBadge.label}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-gray-600 mb-3">
                                  <div className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    </svg>
                                    {application.project.location}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {t.myProjects?.appliedAt || 'Подана:'} {formatDate(application.appliedAt)}
                                  </div>
                                </div>

                                {/* Rejection Reason */}
                                {application.status === 'rejected' && application.rejectionReason && (
                                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                                    <p className="text-xs font-semibold text-red-900 mb-1">{t.myProjects?.rejectionReason || 'Причина отклонения:'}</p>
                                    <p className="text-sm text-red-700">{application.rejectionReason}</p>
                                  </div>
                                )}

                                {/* Action Button */}
                                <Link
                                  href={`/volunteer/projects/${application.project.id}`}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                  {t.myProjects?.viewProject || 'Посмотреть проект'}
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </Link>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </DynamicContent>

        <AiSupportButton />
      </div>
    </SidebarProvider>
  );
}
