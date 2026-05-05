'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import VolunteerNav from '../components/VolunteerNav';
import VolunteerSidebar from '../components/VolunteerSidebar';
import AiSupportButton from '@/app/components/AiSupportButton';
import DynamicContent from '@/app/components/DynamicContent';
import { SidebarProvider } from '@/app/contexts/SidebarContext';

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

export default function ProjectsCatalog() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'volunteers-desc' | 'volunteers-asc'>('date-desc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  const cities = [
    'Все города',
    'Бишкек',
    'Ош',
    'Джалал-Абад',
    'Каракол',
    'Токмок',
    'Нарын',
    'Талас',
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
        await Promise.all([loadCategories(), loadProjects()]);
      } catch (error) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Ошибка загрузки категорий:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects?status=published');
      if (response.ok) {
        const data = await response.json();
        // Фильтруем только активные проекты (не завершенные)
        const activeProjects = data.projects.filter((project: Project) => {
          const endDate = new Date(project.endDate);
          const now = new Date();
          return endDate > now;
        });
        setProjects(activeProjects);
        setFilteredProjects(activeProjects);
      }
    } catch (error) {
      console.error('Ошибка загрузки проектов:', error);
    }
  };

  // Фильтрация проектов
  useEffect(() => {
    let filtered = [...projects];

    // Фильтр по поиску
    if (searchQuery) {
      filtered = filtered.filter(project =>
        project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Фильтр по категории
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(project => 
        project.category.id === selectedCategory
      );
    }

    // Фильтр по городу
    if (selectedCity !== 'all') {
      filtered = filtered.filter(project =>
        project.location.toLowerCase().includes(selectedCity.toLowerCase())
      );
    }

    // Сортировка
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'date-asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name-asc':
          return a.title.localeCompare(b.title);
        case 'name-desc':
          return b.title.localeCompare(a.title);
        case 'volunteers-desc':
          return b.currentVolunteers - a.currentVolunteers;
        case 'volunteers-asc':
          return a.currentVolunteers - b.currentVolunteers;
        default:
          return 0;
      }
    });

    setFilteredProjects(filtered);
  }, [searchQuery, selectedCategory, selectedCity, sortBy, projects]);

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
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Каталог проектов</h1>
          <p className="text-sm text-gray-600">Найдите проект, который вам по душе</p>
        </div>

        {/* Единый контейнер для поиска и фильтров */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-4 p-4">
          {/* Верхняя панель: Поиск + Кнопки отображения + Сброс */}
          <div className="flex flex-col md:flex-row gap-3 mb-3">
            {/* Поисковая строка */}
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Поиск по названию и описанию..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
              />
              <svg 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Кнопки переключения вида */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg border transition-colors ${
                  viewMode === 'list'
                    ? 'bg-[#00CC00] text-white border-[#00CC00]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#00CC00]'
                }`}
                title="Список"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg border transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-[#00CC00] text-white border-[#00CC00]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#00CC00]'
                }`}
                title="Блоки"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              
              {/* Кнопка сброса фильтров */}
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedCity('all');
                  setSearchQuery('');
                  setSortBy('date-desc');
                }}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-200 transition-colors flex items-center gap-1.5"
                title="Сбросить фильтры"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">Сбросить</span>
              </button>
            </div>
          </div>

          {/* Разделитель */}
          <div className="border-t border-gray-100 my-3"></div>

          {/* Кнопка показать/скрыть фильтры */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full px-3 py-1.5 text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-between text-xs font-medium rounded-lg"
          >
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>{showFilters ? 'Скрыть фильтры' : 'Показать фильтры'}</span>
            </div>
            <svg 
              className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Панель фильтров */}
          {showFilters && (
            <div className="pt-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Фильтр по категории */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Категория
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                  >
                    <option value="all">Все категории</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Сортировка */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Сортировка
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                  >
                    <option value="date-desc">Дата: сначала новые</option>
                    <option value="date-asc">Дата: сначала старые</option>
                    <option value="name-asc">Название: А-Я</option>
                    <option value="name-desc">Название: Я-А</option>
                    <option value="volunteers-desc">Волонтёры: ↓</option>
                    <option value="volunteers-asc">Волонтёры: ↑</option>
                  </select>
                </div>

                {/* Фильтр по городу */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Город
                  </label>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                  >
                    {cities.map((city) => (
                      <option key={city} value={city === 'Все города' ? 'all' : city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Projects Grid or List */}
        {filteredProjects.length > 0 ? (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {filteredProjects.map((project) => {
              const startDate = new Date(project.startDate);
              const endDate = new Date(project.endDate);
              const spotsLeft = project.maxVolunteers - project.currentVolunteers;
              
              if (viewMode === 'list') {
                // Режим списка
                return (
                  <div key={project.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="flex flex-col md:flex-row">
                      {/* Project Image */}
                      <div className="relative w-full md:w-48 h-32 md:h-auto bg-gradient-to-br from-[#00CC00] to-emerald-600 flex-shrink-0">
                        {project.imageUrl ? (
                          <img 
                            src={project.imageUrl} 
                            alt={project.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-12 h-12 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        <div className="absolute top-2 left-2">
                          <span className="px-2 py-0.5 bg-white/90 backdrop-blur-sm text-gray-900 rounded-full text-xs font-medium">
                            {project.category.name}
                          </span>
                        </div>
                      </div>

                      {/* Project Info */}
                      <div className="flex-1 p-4">
                        <h3 className="text-base font-bold text-gray-900 mb-1.5">
                          {project.title}
                        </h3>
                        
                        <p className="text-gray-600 text-xs mb-3 line-clamp-2">
                          {project.description}
                        </p>

                        <div className="grid grid-cols-2 gap-2 mb-3">
                          {/* Organizer */}
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span className="truncate">
                              {project.organizer.organizerProfile?.organizationName || 
                               `${project.organizer.firstName} ${project.organizer.lastName}`}
                            </span>
                          </div>

                          {/* Location */}
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            <span>{project.location}</span>
                          </div>

                          {/* Dates */}
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>
                              {startDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} - {endDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>

                          {/* Volunteers */}
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            <span>{project.currentVolunteers} / {project.maxVolunteers}</span>
                            {spotsLeft <= 5 && spotsLeft > 0 && (
                              <span className="text-orange-600 font-medium">({spotsLeft})</span>
                            )}
                          </div>
                        </div>

                        {/* Action Button */}
                        <Link
                          href={`/volunteer/projects/${project.id}`}
                          className={`inline-block px-4 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                            spotsLeft > 0
                              ? 'bg-[#00CC00] text-white hover:bg-[#00b300]'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {spotsLeft > 0 ? 'Подробнее' : 'Мест нет'}
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              }
              
              // Режим сетки
              return (
                <div key={project.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Project Image */}
                  <div className="relative h-36 bg-gradient-to-br from-[#00CC00] to-emerald-600">
                    {project.imageUrl ? (
                      <img 
                        src={project.imageUrl} 
                        alt={project.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    {/* Category Badge */}
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-0.5 bg-white/90 backdrop-blur-sm text-gray-900 rounded-full text-xs font-medium">
                        {project.category.name}
                      </span>
                    </div>
                    {/* Spots Badge */}
                    {spotsLeft <= 5 && spotsLeft > 0 && (
                      <div className="absolute top-2 right-2">
                        <span className="px-2 py-0.5 bg-orange-500 text-white rounded-full text-xs font-medium">
                          {spotsLeft} мест
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Project Info */}
                  <div className="p-4">
                    <h3 className="text-base font-bold text-gray-900 mb-1.5 line-clamp-2">
                      {project.title}
                    </h3>
                    
                    <p className="text-gray-600 text-xs mb-3 line-clamp-2">
                      {project.description}
                    </p>

                    {/* Organizer */}
                    <div className="flex items-center gap-1.5 mb-2 text-xs text-gray-600">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className="truncate">
                        {project.organizer.organizerProfile?.organizationName || 
                         `${project.organizer.firstName} ${project.organizer.lastName}`}
                      </span>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-1.5 mb-2 text-xs text-gray-600">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{project.location}</span>
                    </div>

                    {/* Dates */}
                    <div className="flex items-center gap-1.5 mb-2 text-xs text-gray-600">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>
                        {startDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} - {endDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>

                    {/* Volunteers */}
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <span>{project.currentVolunteers} / {project.maxVolunteers}</span>
                      </div>
                      {spotsLeft === 0 && (
                        <span className="text-xs text-red-600 font-medium">Мест нет</span>
                      )}
                    </div>

                    {/* Action Button */}
                    <Link
                      href={`/volunteer/projects/${project.id}`}
                      className={`block w-full text-center px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                        spotsLeft > 0
                          ? 'bg-[#00CC00] text-white hover:bg-[#00b300]'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {spotsLeft > 0 ? 'Подробнее' : 'Мест нет'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {projects.length === 0 ? 'Проекты скоро появятся' : 'Проекты не найдены'}
            </h3>
            <p className="text-sm text-gray-600 max-w-md mx-auto mb-6">
              {projects.length === 0 
                ? 'Мы работаем над наполнением каталога интересными волонтёрскими проектами. Загляните позже!'
                : 'Попробуйте изменить параметры поиска или сбросить фильтры.'
              }
            </p>
            <div className="flex gap-3 justify-center">
              {projects.length === 0 ? (
                <>
                  <button className="px-5 py-2 text-sm bg-[#00CC00] text-white rounded-full font-medium hover:bg-[#00b300] transition-colors">
                    Подписаться на уведомления
                  </button>
                  <Link 
                    href="/volunteer/dashboard"
                    className="px-5 py-2 text-sm bg-gray-100 text-gray-700 rounded-full font-medium hover:bg-gray-200 transition-colors"
                  >
                    Вернуться на главную
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
                  Сбросить фильтры
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
