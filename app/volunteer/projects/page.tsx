'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import VolunteerNav from '../components/VolunteerNav';
import VolunteerSidebar from '../components/VolunteerSidebar';
import AiSupportButton from '@/app/components/AiSupportButton';
import DynamicContent from '@/app/components/DynamicContent';
import { SidebarProvider } from '@/app/contexts/SidebarContext';
import CustomSelect from '@/app/components/CustomSelect';
import { useTranslation } from '@/app/i18n/useTranslation';
import { Tooltip } from '@/app/components/Tooltip';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

interface Category {
  id: string;
  name: string;
}

interface Organizer {
  id: string;
  firstName: string;
  lastName: string;
  organizerProfile?: {
    organizationName: string;
  };
}

interface Project {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  location: string;
  startDate: string;
  endDate: string;
  maxVolunteers: number;
  currentVolunteers: number;
  status: string;
  category: Category;
  organizer: Organizer;
  createdAt: string;
}

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

export default function ProjectsCatalog() {
  const router = useRouter();
  const { t, locale } = useTranslation('volunteer');
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProjects, setTotalProjects] = useState(0);
  const [dataLoading, setDataLoading] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'volunteers-desc' | 'volunteers-asc'>('date-desc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // value хранится в одном виде (для совместимости с данными БД), label локализуется
  const cityOptions: { value: string; ru: string; kg: string }[] = [
    { value: 'Бишкек',      ru: 'Бишкек',       kg: 'Бишкек' },
    { value: 'Ош',          ru: 'Ош',           kg: 'Ош' },
    { value: 'Джалал-Абад', ru: 'Джалал-Абад',  kg: 'Жалал-Абад' },
    { value: 'Каракол',     ru: 'Каракол',      kg: 'Каракол' },
    { value: 'Токмок',      ru: 'Токмок',       kg: 'Токмок' },
    { value: 'Нарын',       ru: 'Нарын',        kg: 'Нарын' },
    { value: 'Талас',       ru: 'Талас',        kg: 'Талас' },
  ];

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
          router.push('/login');
          return;
        }
        const data = await response.json();
        if (data.user.role !== 'volunteer') {
          router.push('/dashboard');
          return;
        }
        setUser(data.user);
        
        // Загружаем категории и проекты
        await loadCategories(locale);
      } catch (error) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // Перезагрузка категорий при смене языка (после первичной загрузки)
  useEffect(() => {
    if (!user) return;
    loadCategories(locale);
  }, [locale, user]);

  const loadCategories = async (loc: string = 'ru') => {
    try {
      const response = await fetch(`/api/categories?locale=${loc}`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Ошибка загрузки категорий:', error);
    }
  };

  const loadProjects = useCallback(async (pageNum: number = 1) => {
    setDataLoading(true);
    try {
      const params = new URLSearchParams({
        status: 'recruiting',
        locale,
        page: String(pageNum),
        limit: '9',
        endDateAfter: new Date().toISOString(),
        sortBy,
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (selectedCategory !== 'all') params.set('categoryId', selectedCategory);
      if (selectedCity !== 'all') params.set('city', selectedCity);

      const response = await fetch(`/api/projects?${params}`);
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects);
        setTotalProjects(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Ошибка загрузки проектов:', error);
    } finally {
      setDataLoading(false);
    }
  }, [debouncedSearch, selectedCategory, selectedCity, sortBy, locale]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!user) return;
    setPage(1);
    loadProjects(1);
  }, [loadProjects, user]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadProjects(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

        {/* Main Content */}
        <DynamicContent>
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{t.projects?.title || 'Каталог проектов'}</h1>
          <p className="text-sm text-gray-600">{t.projects?.subtitle || 'Найдите проект, который вам по душе'}</p>
        </div>

        {/* Единый контейнер для поиска и фильтров */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-300 mb-6 p-6">
          {/* Верхняя панель: Поиск + Кнопки отображения + Сброс */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            {/* Поисковая строка */}
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder={t.projects?.searchPlaceholder || 'Поиск по названию и описанию...'}
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

            {/* Кнопка переключения вида (одна кнопка-тогл) */}
            <div className="flex gap-2">
              <Tooltip text={viewMode === 'grid' ? (t.projects?.viewList || 'Переключить на список') : (t.projects?.viewGrid || 'Переключить на блоки')}>
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

              {/* Кнопка сброса фильтров — только если активен хотя бы один фильтр */}
              {(searchQuery || selectedCategory !== 'all' || selectedCity !== 'all' || sortBy !== 'date-desc') && (
                <Tooltip text={t.projects?.resetFilters || 'Сбросить фильтры'}>
                  <button
                    onClick={() => {
                      setSelectedCategory('all');
                      setSelectedCity('all');
                      setSearchQuery('');
                      setSortBy('date-desc');
                    }}
                    className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-200 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="hidden sm:inline">{t.projects?.reset || 'Сбросить'}</span>
                  </button>
                </Tooltip>
              )}
            </div>
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
              <span>{showFilters ? (t.projects?.hideFilters || 'Скрыть фильтры') : (t.projects?.showFilters || 'Показать фильтры')}</span>
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
                {/* Фильтр по категории */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.common?.category || 'Категория'}
                  </label>
                  <CustomSelect
                    options={[
                      { value: 'all', label: t.projects?.allCategories || 'Все категории' },
                      ...categories.map((cat) => ({ value: cat.id, label: cat.name }))
                    ]}
                    value={selectedCategory}
                    onChange={setSelectedCategory}
                    placeholder={t.projects?.allCategories || 'Все категории'}
                  />
                </div>

                {/* Сортировка */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.common?.sortBy || 'Сортировка'}
                  </label>
                  <CustomSelect
                    options={[
                      { value: 'date-desc', label: t.projects?.sortDateDesc || 'Дата: сначала новые' },
                      { value: 'date-asc', label: t.projects?.sortDateAsc || 'Дата: сначала старые' },
                      { value: 'name-asc', label: t.projects?.sortNameAZ || 'Название: А-Я' },
                      { value: 'name-desc', label: t.projects?.sortNameZA || 'Название: Я-А' },
                      { value: 'volunteers-desc', label: t.projects?.sortVolunteersDescLabel || 'Волонтёры: по убыванию' },
                      { value: 'volunteers-asc', label: t.projects?.sortVolunteersAscLabel || 'Волонтёры: по возрастанию' },
                    ]}
                    value={sortBy}
                    onChange={(value) => setSortBy(value as any)}
                    placeholder={t.projects?.sortPlaceholder || t.common?.sortBy || 'Сортировка'}
                  />
                </div>

                {/* Фильтр по городу */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.common?.city || 'Город'}
                  </label>
                  <CustomSelect
                    options={[
                      { value: 'all', label: t.projects?.allCities || 'Все города' },
                      ...cityOptions.map((c) => ({ value: c.value, label: locale === 'kg' ? c.kg : c.ru })),
                    ]}
                    value={selectedCity}
                    onChange={setSelectedCity}
                    placeholder={t.projects?.allCities || 'Все города'}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Projects Grid or List */}
        {projects.length > 0 ? (
          <div className="relative">
            {dataLoading && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded-xl" style={{ minHeight: 200 }}>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00CC00]" />
              </div>
            )}
            {/* Режим списка */}
            {viewMode === 'list' && (
              <div className="space-y-3">
                {projects.map((project) => (
                  <div 
                    key={project.id} 
                    onClick={() => router.push(`/volunteer/projects/${project.id}`)}
                    className="bg-white border border-gray-300 rounded-lg p-4 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      {/* Изображение проекта */}
                      {project.imageUrl && (
                        <img 
                          src={project.imageUrl} 
                          alt={project.title}
                          className="w-20 h-20 object-cover rounded-lg flex-shrink-0 border border-gray-200"
                        />
                      )}
                      
                      {/* Информация о проекте */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
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
                            {project.currentVolunteers}/{project.maxVolunteers}
                          </div>
                          <div className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(project.startDate).toLocaleDateString(locale === 'kg' ? 'ky-KG' : 'ru-RU')}
                          </div>
                        </div>
                      </div>

                      {/* Стрелка */}
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

            {/* Режим блоков */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project) => (
                  <div 
                    key={project.id} 
                    onClick={() => router.push(`/volunteer/projects/${project.id}`)}
                    className="bg-white border border-gray-300 rounded-xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer"
                  >
                    {/* Изображение */}
                    {project.imageUrl ? (
                      <img 
                        src={project.imageUrl} 
                        alt={project.title}
                        className="w-full h-40 object-cover border-b border-gray-200"
                      />
                    ) : (
                      <div className="w-full h-40 bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center border-b border-gray-200">
                        <svg className="w-16 h-16 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}

                    {/* Контент */}
                    <div className="p-5">
                      {/* Заголовок и статус */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <h3 className="text-lg font-bold text-gray-900 flex-1">{project.title}</h3>
                      </div>

                      {/* Локация и дата */}
                      <div className="space-y-2 text-sm text-gray-600 mb-4">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          <span className="truncate">{project.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{new Date(project.startDate).toLocaleDateString(locale === 'kg' ? 'ky-KG' : 'ru-RU')}</span>
                        </div>
                      </div>

                      {/* Стрелка */}
                      <div className="flex items-center justify-end">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="flex items-center px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                {getPaginationPages(page, totalPages).map((p, idx) =>
                  p === '...' ? (
                    <span key={`e-${idx}`} className="px-1 text-gray-400 text-sm">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p as number)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                        p === page
                          ? 'bg-[#00CC00] text-white'
                          : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="flex items-center px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
            {totalProjects > 0 && (
              <p className="text-sm text-gray-500 text-center mt-3">
                {t.projects?.showing || 'Показано'} {(page - 1) * 9 + 1}–{Math.min(page * 9, totalProjects)} {t.projects?.of || 'из'} {totalProjects}
              </p>
            )}
          </div>
        ) : dataLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#00CC00]" />
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {!(searchQuery || selectedCategory !== 'all' || selectedCity !== 'all')
                ? (t.projects?.noProjectsTitle || 'Проекты скоро появятся')
                : (t.projects?.noProjectsFoundTitle || t.projects?.noProjects || 'Проекты не найдены')}
            </h3>
            <p className="text-sm text-gray-600 max-w-md mx-auto mb-6">
              {!(searchQuery || selectedCategory !== 'all' || selectedCity !== 'all')
                ? (t.projects?.noProjectsHintEmpty || 'Мы работаем над наполнением каталога интересными волонтёрскими проектами. Загляните позже!')
                : (t.projects?.noProjectsHintFiltered || 'Попробуйте изменить параметры поиска или сбросить фильтры.')
              }
            </p>
            <div className="flex gap-3 justify-center">
              {!(searchQuery || selectedCategory !== 'all' || selectedCity !== 'all') ? (
                <>
                  <button className="px-5 py-2 text-sm bg-[#00CC00] text-white rounded-full font-medium hover:bg-[#00b300] transition-colors">
                    {t.projects?.subscribeNotifications || 'Подписаться на уведомления'}
                  </button>
                  <Link 
                    href="/volunteer/dashboard"
                    className="px-5 py-2 text-sm bg-gray-100 text-gray-700 rounded-full font-medium hover:bg-gray-200 transition-colors"
                  >
                    {t.projects?.backToDashboard || 'Вернуться на главную'}
                  </Link>
                </>
              ) : (
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedCity('all');
                    setSearchQuery('');
                  }}
                  className="px-5 py-2 text-sm bg-[#00CC00] text-white rounded-full font-medium hover:bg-[#00b300] transition-colors"
                >
                  {t.projects?.resetFilters || 'Сбросить фильтры'}
                </button>
              )}
            </div>
          </div>
        )}
      </DynamicContent>

      {/* AI Support Button */}
      <AiSupportButton />
    </div>
    </SidebarProvider>
  );
}
