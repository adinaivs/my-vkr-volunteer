'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '../components/AdminSidebar';
import AdminNav from '../components/AdminNav';
import DynamicContent from '@/app/components/DynamicContent';
import { SidebarProvider } from '@/app/contexts/SidebarContext';
import { useToast } from '@/app/components/ToastContainer';
import CustomSelect from '@/app/components/CustomSelect';
import { useTranslation } from '@/app/i18n/useTranslation';
import { Tooltip } from '@/app/components/Tooltip';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
}

interface Category {
  id: string;
  slug: string;
  icon: string;
}

interface Organizer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  organizerProfile: {
    organizationName: string;
  } | null;
}

interface Project {
  id: string;
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  maxVolunteers: number;
  currentVolunteers: number;
  status: 'draft' | 'moderation' | 'recruiting' | 'rejected' | 'completed' | 'blocked' | 'upcoming' | 'active' | 'cancelled';
  rejectionReason?: string | null;
  publishedAt?: string | null;
  moderatedAt?: string | null;
  createdAt: string;
  imageUrl?: string | null;
  category: Category;
  organizer: Organizer;
}

export default function AdminProjectsPage() {
  const router = useRouter();
  const toast = useToast();
  const { t } = useTranslation('admin');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'moderation' | 'recruiting' | 'active' | 'completed' | 'rejected' | 'cancelled' | 'blocked' | 'all'>('moderation');

  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'name-desc'>('date-desc');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProjects, setTotalProjects] = useState(0);
  const [dataLoading, setDataLoading] = useState(false);

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

        setCurrentUser(data.user);

        try {
          const categoriesResponse = await fetch('/api/categories');
          if (categoriesResponse.ok) {
            const categoriesData = await categoriesResponse.json();
            setCategories(categoriesData.categories || []);
          }
        } catch (catError) {
          console.error('Error loading categories:', catError);
        }
      } catch (error) {
        router.push('/admin/login');
      }
    };

    checkAuth();
  }, [router]);

  const fetchProjects = useCallback(async (pageNum = 1) => {
    setDataLoading(true);
    try {
      const params = new URLSearchParams({ status: filter, page: String(pageNum), limit: '12', sortBy });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (filterCategory !== 'all') params.set('categoryId', filterCategory);
      const response = await fetch(`/api/admin/projects?${params}`);
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects);
        setTotalProjects(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setDataLoading(false);
      setLoading(false);
    }
  }, [filter, debouncedSearch, filterCategory, sortBy]);

  const resetFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSortBy('date-desc');
    setFilterCategory('all');
    setPage(1);
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (currentUser) {
      setPage(1);
      fetchProjects(1);
    }
  }, [fetchProjects, currentUser]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchProjects(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  function getPaginationPages(current: number, total: number): (number | string)[] {
    const pages: (number | string)[] = [];
    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || Math.abs(i - current) <= 1) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  }

  const getStatusBadge = (status: Project['status']) => {
    switch (status) {
      case 'moderation':
        return (
          <span className="px-3 py-1 bg-orange-100 text-orange-700 text-sm font-medium rounded-full flex items-center gap-1 whitespace-nowrap">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            На модерации
          </span>
        );
      case 'recruiting':
        return (
          <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full flex items-center gap-1 whitespace-nowrap">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Набор волонтёров
          </span>
        );
      case 'active':
        return (
          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full flex items-center gap-1 whitespace-nowrap">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Активный
          </span>
        );
      case 'upcoming':
        return (
          <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-medium rounded-full flex items-center gap-1 whitespace-nowrap">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Скоро
          </span>
        );
      case 'completed':
        return (
          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm font-medium rounded-full flex items-center gap-1 whitespace-nowrap">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Завершён
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full flex items-center gap-1 whitespace-nowrap">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Отклонён
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-3 py-1 bg-red-50 text-red-500 text-sm font-medium rounded-full flex items-center gap-1 whitespace-nowrap">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            Отменён
          </span>
        );
      case 'blocked':
        return (
          <span className="px-3 py-1 bg-gray-800 text-white text-sm font-medium rounded-full flex items-center gap-1 whitespace-nowrap">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            Заблокирован
          </span>
        );
      case 'draft':
        return (
          <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full whitespace-nowrap">
            Черновик
          </span>
        );
      default:
        return null;
    }
  };

  const getStatusBadgeOverlay = (status: Project['status']) => {
    const map: Record<string, { label: string; cls: string }> = {
      moderation: { label: 'На модерации',    cls: 'bg-orange-500 text-white' },
      recruiting: { label: 'Набор',           cls: 'bg-green-500 text-white'  },
      active:     { label: 'Активный',        cls: 'bg-blue-500 text-white'   },
      upcoming:   { label: 'Скоро',           cls: 'bg-purple-500 text-white' },
      completed:  { label: 'Завершён',        cls: 'bg-gray-500 text-white'   },
      rejected:   { label: 'Отклонён',        cls: 'bg-red-500 text-white'    },
      cancelled:  { label: 'Отменён',         cls: 'bg-red-400 text-white'    },
      blocked:    { label: 'Заблокирован',    cls: 'bg-gray-800 text-white'   },
      draft:      { label: 'Черновик',        cls: 'bg-gray-500 text-white'   },
    };
    const b = map[status];
    if (!b) return null;
    return (
      <span className={`absolute top-2 right-2 px-2.5 py-1 text-xs font-semibold rounded-full whitespace-nowrap shadow ${b.cls}`}>
        {b.label}
      </span>
    );
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
                {t.projects?.title || 'Проекты'}
              </h1>
              <p className="text-gray-600">
                Управление проектами, отправленными на модерацию
              </p>
            </div>

            {/* Поиск и фильтры */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-300 mb-6 p-6">
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder={t.projects?.searchPlaceholder || 'Поиск по названию...'}
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

                <div className="flex gap-2">
                  <Tooltip text={viewMode === 'grid' ? 'Переключить на список' : 'Переключить на блоки'}>
                    <button
                      onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                      className="p-3 rounded-xl border bg-[#00CC00] text-white border-[#00CC00] transition-colors hover:bg-[#00b300]"
                    >
                    {viewMode === 'list' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                    )}
                  </button>
                  </Tooltip>

                  {(searchQuery || filterCategory !== 'all' || sortBy !== 'date-desc') && (
                    <Tooltip text="Сбросить фильтры">
                      <button
                        onClick={resetFilters}
                        className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-200 transition-colors flex items-center gap-2 whitespace-nowrap"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span className="hidden sm:inline">Сбросить</span>
                      </button>
                    </Tooltip>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-100 my-4"></div>

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

              {showFilters && (
                <div className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Статус</label>
                      <CustomSelect
                        value={filter}
                        onChange={(value) => setFilter(value as typeof filter)}
                        options={[
                          { value: 'moderation', label: 'На модерации' },
                          { value: 'recruiting', label: 'Набор волонтёров' },
                          { value: 'active', label: 'Активные' },
                          { value: 'completed', label: 'Завершённые' },
                          { value: 'rejected', label: 'Отклонённые' },
                          { value: 'cancelled', label: 'Отменённые' },
                          { value: 'blocked', label: 'Заблокированные' },
                          { value: 'all', label: 'Все' },
                        ]}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Сортировка</label>
                      <CustomSelect
                        value={sortBy}
                        onChange={(value) => setSortBy(value as typeof sortBy)}
                        options={[
                          { value: 'date-desc', label: 'Дата: сначала новые' },
                          { value: 'date-asc', label: 'Дата: сначала старые' },
                          { value: 'name-asc', label: 'Название: А-Я' },
                          { value: 'name-desc', label: 'Название: Я-А' },
                        ]}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Категория {categories.length > 0 && `(${categories.length})`}
                      </label>
                      <CustomSelect
                        value={filterCategory}
                        onChange={(value) => setFilterCategory(value)}
                        options={[
                          { value: 'all', label: 'Все категории' },
                          ...(categories.length === 0
                            ? [{ value: 'loading', label: 'Загрузка категорий...', disabled: true }]
                            : categories.map((cat) => ({
                                value: cat.id,
                                label: cat.slug,
                              }))
                          ),
                        ]}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Список проектов */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00] mx-auto"></div>
              </div>
            ) : projects.length === 0 ? (
              <div className="bg-white rounded-xl shadow-xl border border-gray-300 p-12 text-center">
                <p className="text-gray-500">
                  {debouncedSearch || filterCategory !== 'all'
                    ? (t.projects?.noProjects || 'Проекты не найдены')
                    : (t.projects?.noProjects || 'Нет проектов для отображения')}
                </p>
              </div>
            ) : (
              <div className="relative">
                {dataLoading && (
                  <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded-xl" style={{ minHeight: 200 }}>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00CC00]" />
                  </div>
                )}
                {/* Список */}
                {viewMode === 'list' && (
                  <div className="space-y-3">
                    {projects.map((project) => (
                      <div
                        key={project.id}
                        className="bg-white border border-gray-300 rounded-lg p-4 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer"
                        onClick={() => router.push(`/admin/projects/${project.id}`)}
                      >
                        <div className="flex items-center gap-4">
                          {project.imageUrl ? (
                            <div className="relative flex-shrink-0">
                              <img
                                src={project.imageUrl}
                                alt={project.title}
                                className="w-20 h-20 object-cover rounded-lg"
                              />
                              {getStatusBadgeOverlay(project.status)}
                            </div>
                          ) : (
                            <div className="relative flex-shrink-0">
                              <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center">
                                <svg className="w-10 h-10 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                              {getStatusBadgeOverlay(project.status)}
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="text-lg font-semibold text-gray-900 truncate">{project.title}</h3>
                            </div>
                            <p className="text-sm text-gray-600 mb-2 line-clamp-1">{project.description}</p>
                            <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                              <div className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                </svg>
                                {project.location}
                              </div>
                              <div className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                {project.currentVolunteers}/{project.maxVolunteers} волонтёров
                              </div>
                              <div className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {new Date(project.startDate).toLocaleDateString('ru-RU')}
                              </div>
                            </div>
                          </div>

                          <div className="flex-shrink-0">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Блоки */}
                {viewMode === 'grid' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects.map((project) => (
                      <div
                        key={project.id}
                        className="bg-white border border-gray-300 rounded-xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer"
                        onClick={() => router.push(`/admin/projects/${project.id}`)}
                      >
                        <div className="relative">
                          {project.imageUrl ? (
                            <img
                              src={project.imageUrl}
                              alt={project.title}
                              className="w-full h-40 object-cover"
                            />
                          ) : (
                            <div className="w-full h-40 bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                              <svg className="w-16 h-16 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          {getStatusBadgeOverlay(project.status)}
                        </div>

                        <div className="p-5">
                          <div className="mb-3">
                            <h3 className="text-lg font-bold text-gray-900 line-clamp-2">{project.title}</h3>
                          </div>

                          <div className="space-y-2 text-sm text-gray-600 mb-4">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              </svg>
                              <span className="truncate">{project.location}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                              </svg>
                              <span>{project.currentVolunteers}/{project.maxVolunteers} волонтёров</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>{new Date(project.startDate).toLocaleDateString('ru-RU')}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-end">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Пагинация */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8 flex-wrap">
                    <button onClick={() => handlePageChange(page - 1)} disabled={page <= 1}
                      className="flex items-center px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    {getPaginationPages(page, totalPages).map((p, idx) =>
                      p === '...' ? (
                        <span key={`e-${idx}`} className="px-1 text-gray-400 text-sm">…</span>
                      ) : (
                        <button key={p} onClick={() => handlePageChange(p as number)}
                          className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                            p === page ? 'bg-[#00CC00] text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}>{p}</button>
                      )
                    )}
                    <button onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages}
                      className="flex items-center px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}
                {totalProjects > 0 && (
                  <p className="text-sm text-gray-500 text-center mt-3">
                    Показано {(page - 1) * 12 + 1}–{Math.min(page * 12, totalProjects)} из {totalProjects}
                  </p>
                )}
              </div>
            )}
          </div>
        </DynamicContent>
      </div>
    </SidebarProvider>
  );
}
