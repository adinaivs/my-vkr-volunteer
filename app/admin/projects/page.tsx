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

interface Task {
  id: string;
  title: string;
  description: string;
  requiredVolunteers: number;
  currentVolunteers: number;
  deadline: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  requiredSkill: {
    id: string;
    name: string;
  } | null;
}

export default function AdminProjectsPage() {
  const router = useRouter();
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'moderation' | 'recruiting' | 'rejected' | 'all'>('moderation');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  
  // Новые состояния для фильтрации и отображения
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'name-desc'>('date-desc');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // Блокировка скролла при открытии модальных окон
  useEffect(() => {
    if (showDetailsModal || selectedProject) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showDetailsModal, selectedProject]);

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
        
        // Загружаем категории
        try {
          const categoriesResponse = await fetch('/api/categories');
          if (categoriesResponse.ok) {
            const categoriesData = await categoriesResponse.json();
            console.log('Categories loaded:', categoriesData);
            setCategories(categoriesData.categories || []);
          } else {
            console.error('Failed to load categories:', categoriesResponse.status);
          }
        } catch (catError) {
          console.error('Error loading categories:', catError);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/admin/login');
      }
    };

    checkAuth();
  }, [router]);

  // Функция фильтрации и сортировки проектов
  const getFilteredAndSortedProjects = () => {
    let filtered = [...projects];

    // Исключаем черновики - они не должны отображаться у админа
    filtered = filtered.filter(project => project.status !== 'draft');

    // Фильтр по поисковому запросу
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(project => 
        project.title.toLowerCase().includes(query) || 
        project.description.toLowerCase().includes(query) ||
        project.organizer.organizerProfile?.organizationName?.toLowerCase().includes(query) ||
        `${project.organizer.firstName} ${project.organizer.lastName}`.toLowerCase().includes(query)
      );
    }

    // Фильтр по категории
    if (filterCategory !== 'all') {
      filtered = filtered.filter(project => project.category.id === filterCategory);
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
    setFilterCategory('all');
  };

  useEffect(() => {
    if (currentUser) {
      fetchProjects();
    }
  }, [filter, currentUser]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/projects?status=${filter}`);
      
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects);
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectTasks = async (projectId: string) => {
    try {
      setLoadingTasks(true);
      const response = await fetch(`/api/admin/projects/${projectId}/tasks`);
      
      if (response.ok) {
        const data = await response.json();
        setProjectTasks(data.tasks);
      } else {
        console.error('Error fetching tasks');
        setProjectTasks([]);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setProjectTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleApprove = async (projectId: string) => {
    toast.confirm(
      'Вы уверены, что хотите одобрить этот проект?',
      async () => {
        try {
          setActionLoading(true);
          const response = await fetch(`/api/admin/projects/${projectId}/approve`, {
            method: 'POST',
          });

          if (response.ok) {
            toast.success('Проект успешно одобрен и опубликован!');
            fetchProjects();
            setShowDetailsModal(false);
            setSelectedProject(null);
          } else {
            const data = await response.json();
            toast.error(data.error || 'Ошибка при одобрении');
          }
        } catch (error) {
          console.error('Error approving project:', error);
          toast.error('Ошибка при одобрении проекта');
        } finally {
          setActionLoading(false);
        }
      },
      'info'
    );
  };

  const handleReject = async (projectId: string) => {
    if (!rejectReason.trim()) {
      toast.error('Пожалуйста, укажите причину отклонения');
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/projects/${projectId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });

      if (response.ok) {
        toast.success('Проект отклонен');
        fetchProjects();
        setShowDetailsModal(false);
        setSelectedProject(null);
        setRejectReason('');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Ошибка при отклонении');
      }
    } catch (error) {
      console.error('Error rejecting project:', error);
      toast.error('Ошибка при отклонении проекта');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: Project['status']) => {
    switch (status) {
      case 'moderation':
        return (
          <span className="px-3 py-1 bg-orange-100 text-orange-700 text-sm font-medium rounded-full flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            На модерации
          </span>
        );
      case 'recruiting':
        return (
          <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Набор волонтеров
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Отклонен
          </span>
        );
      case 'draft':
        return (
          <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
            Черновик
          </span>
        );
      default:
        return null;
    }
  };

  const getTaskStatusBadge = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      case 'overdue':
        return 'bg-red-100 text-red-700';
      case 'cancelled':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  const getTaskStatusText = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return 'Завершена';
      case 'in_progress':
        return 'В процессе';
      case 'overdue':
        return 'Просрочена';
      case 'cancelled':
        return 'Отменена';
      default:
        return 'Ожидает';
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
              Модерация проектов
            </h1>
            <p className="text-gray-600">
              Управление проектами, отправленными на модерацию
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
                  placeholder="Поиск по названию и описанию..."
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

              {/* Кнопки переключения вида */}
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-3 rounded-xl border transition-colors ${
                    viewMode === 'list'
                      ? 'bg-[#00CC00] text-white border-[#00CC00]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#00CC00]'
                  }`}
                  title="Список"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-3 rounded-xl border transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-[#00CC00] text-white border-[#00CC00]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#00CC00]'
                  }`}
                  title="Блоки"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                
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
                      <option value="moderation">На модерации</option>
                      <option value="recruiting">Опубликованные</option>
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
                      <option value="date-desc">Дата: сначала новые</option>
                      <option value="date-asc">Дата: сначала старые</option>
                      <option value="name-asc">Название: А-Я</option>
                      <option value="name-desc">Название: Я-А</option>
                    </select>
                  </div>

                  {/* Фильтр по категории */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Категория {categories.length > 0 && `(${categories.length})`}
                    </label>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent text-sm"
                    >
                      <option value="all">Все категории</option>
                      {categories.length === 0 ? (
                        <option disabled>Загрузка категорий...</option>
                      ) : (
                        categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.icon} {cat.slug}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Projects List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00] mx-auto"></div>
            </div>
          ) : getFilteredAndSortedProjects().length === 0 ? (
            <div className="bg-white rounded-xl shadow-xl border border-gray-300 p-12 text-center">
              <p className="text-gray-500">
                {searchQuery || filterCategory !== 'all' 
                  ? 'Проекты не найдены. Попробуйте изменить параметры поиска или фильтры.' 
                  : 'Нет проектов для отображения'}
              </p>
            </div>
          ) : (
            <>
              {/* Режим списка */}
              {viewMode === 'list' && (
                <div className="space-y-3">
                  {getFilteredAndSortedProjects().map((project) => (
                    <div 
                      key={project.id} 
                      className="bg-white border border-gray-300 rounded-lg p-4 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer"
                      onClick={() => {
                        setSelectedProject(project);
                        setShowDetailsModal(true);
                        fetchProjectTasks(project.id);
                      }}
                    >
                      <div className="flex items-center gap-4">
                        {/* Изображение проекта */}
                        {project.imageUrl && (
                          <img 
                            src={project.imageUrl} 
                            alt={project.title}
                            className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                          />
                        )}
                        
                        {/* Информация о проекте */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">{project.title}</h3>
                            {getStatusBadge(project.status)}
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
                              {new Date(project.startDate).toLocaleDateString('ru-RU')}
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
                {getFilteredAndSortedProjects().map((project) => (
                  <div
                    key={project.id}
                    className="bg-white border border-gray-300 rounded-xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer"
                    onClick={() => {
                      setSelectedProject(project);
                      setShowDetailsModal(true);
                      fetchProjectTasks(project.id);
                    }}
                  >
                    {/* Изображение */}
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

                    {/* Контент */}
                    <div className="p-5">
                      {/* Заголовок и статус */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <h3 className="text-lg font-bold text-gray-900 flex-1">{project.title}</h3>
                        {getStatusBadge(project.status)}
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
                          <span>{new Date(project.startDate).toLocaleDateString('ru-RU')}</span>
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
          </>
          )}
        </div>
      </DynamicContent>

      {/* Details Modal */}
      {showDetailsModal && selectedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {selectedProject.title}
                </h3>
                {getStatusBadge(selectedProject.status)}
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedProject(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Изображение проекта */}
              {selectedProject.imageUrl && (
                <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={selectedProject.imageUrl}
                    alt={selectedProject.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Если изображение не загрузилось, показываем заглушку
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = `
                        <div class="w-full h-full flex items-center justify-center bg-gray-100">
                          <svg class="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      `;
                    }}
                  />
                </div>
              )}

              <div>
                <h4 className="font-semibold text-gray-900 mb-1 text-sm">Описание</h4>
                <p className="text-gray-600 text-sm">{selectedProject.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1 text-sm">Организатор</h4>
                  <p className="text-gray-600 text-sm">
                    {selectedProject.organizer.organizerProfile?.organizationName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedProject.organizer.firstName} {selectedProject.organizer.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{selectedProject.organizer.email}</p>
                  <p className="text-xs text-gray-500">{selectedProject.organizer.phone}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-1 text-sm">Детали проекта</h4>
                  <p className="text-xs text-gray-600">
                    <span className="font-medium">Категория:</span> {selectedProject.category.icon} {selectedProject.category.slug}
                  </p>
                  <p className="text-xs text-gray-600">
                    <span className="font-medium">Локация:</span> {selectedProject.location}
                  </p>
                  <p className="text-xs text-gray-600">
                    <span className="font-medium">Волонтёры:</span> {selectedProject.currentVolunteers} / {selectedProject.maxVolunteers}
                  </p>
                  <p className="text-xs text-gray-600">
                    <span className="font-medium">Период:</span> {new Date(selectedProject.startDate).toLocaleDateString('ru-RU')} - {new Date(selectedProject.endDate).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              </div>

              {/* Задачи проекта */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Задачи проекта
                  {!loadingTasks && projectTasks.length > 0 && (
                    <span className="text-xs font-normal text-gray-500">
                      ({projectTasks.length})
                    </span>
                  )}
                </h4>
                
                {loadingTasks ? (
                  <div className="text-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#00CC00] mx-auto"></div>
                    <p className="text-xs text-gray-500 mt-2">Загрузка задач...</p>
                  </div>
                ) : projectTasks.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <svg className="w-8 h-8 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-gray-500 text-xs">Задачи не добавлены</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {projectTasks.map((task, index) => (
                      <div key={task.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200 hover:border-[#00CC00] transition-colors">
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-start gap-2 flex-1">
                            <span className="flex-shrink-0 w-5 h-5 bg-[#00CC00] text-white rounded-full flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </span>
                            <h5 className="font-medium text-gray-900 text-sm">{task.title}</h5>
                          </div>
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium flex-shrink-0 ml-2 ${getTaskStatusBadge(task.status)}`}>
                            {getTaskStatusText(task.status)}
                          </span>
                        </div>
                        
                        <p className="text-xs text-gray-600 mb-2 ml-7">{task.description}</p>
                        
                        <div className="flex flex-wrap gap-1.5 text-xs ml-7">
                          {task.requiredSkill && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                              {task.requiredSkill.name}
                            </span>
                          )}
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            {task.currentVolunteers} / {task.requiredVolunteers}
                          </span>
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            До {new Date(task.deadline).toLocaleDateString('ru-RU')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedProject.status === 'moderation' && (
                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleApprove(selectedProject.id)}
                    disabled={actionLoading}
                    className="flex-1 px-3 py-1.5 bg-[#00CC00] text-white rounded-lg text-sm font-medium hover:bg-[#00b300] transition-colors disabled:opacity-50"
                  >
                    Одобрить
                  </button>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    disabled={actionLoading}
                    className="flex-1 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
                  >
                    Отклонить
                  </button>
                  <button
                    onClick={async () => {
                      toast.confirm(
                        'Вы уверены, что хотите удалить этот проект? Это действие нельзя отменить.',
                        async () => {
                          try {
                            setActionLoading(true);
                            const response = await fetch(`/api/admin/projects/${selectedProject.id}`, {
                              method: 'DELETE',
                            });

                            if (response.ok) {
                              toast.success('Проект успешно удален');
                              setShowDetailsModal(false);
                              setSelectedProject(null);
                              fetchProjects();
                            } else {
                              const data = await response.json();
                              toast.error(data.error || 'Ошибка при удалении проекта');
                            }
                          } catch (error) {
                            console.error('Error deleting project:', error);
                            toast.error('Ошибка при удалении проекта');
                          } finally {
                            setActionLoading(false);
                          }
                        },
                        'error'
                      );
                    }}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Удалить
                  </button>
                </div>
              )}

              {/* Кнопка удаления для админа (для остальных статусов) */}
              {selectedProject.status !== 'moderation' && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        setSelectedProject(null);
                      }}
                      disabled={actionLoading}
                      className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      Закрыть
                    </button>
                    <button
                      onClick={async () => {
                        toast.confirm(
                          'Вы уверены, что хотите удалить этот проект? Это действие нельзя отменить.',
                          async () => {
                            try {
                              setActionLoading(true);
                              const response = await fetch(`/api/admin/projects/${selectedProject.id}`, {
                                method: 'DELETE',
                              });

                              if (response.ok) {
                                toast.success('Проект успешно удален');
                                setShowDetailsModal(false);
                                setSelectedProject(null);
                                fetchProjects();
                              } else {
                                const data = await response.json();
                                toast.error(data.error || 'Ошибка при удалении проекта');
                              }
                            } catch (error) {
                              console.error('Error deleting project:', error);
                              toast.error('Ошибка при удалении проекта');
                            } finally {
                              setActionLoading(false);
                            }
                          },
                          'error'
                        );
                      }}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Удалить
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {selectedProject && !showDetailsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5">
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              Отклонить проект
            </h3>
            <p className="text-gray-600 mb-3 text-sm">
              Укажите причину отклонения проекта{' '}
              <strong>{selectedProject.title}</strong>
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Причина отклонения..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00CC00] focus:border-transparent resize-none text-sm"
              rows={3}
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handleReject(selectedProject.id)}
                disabled={actionLoading || !rejectReason.trim()}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 text-sm font-medium"
              >
                Отклонить
              </button>
              <button
                onClick={() => {
                  setSelectedProject(null);
                  setRejectReason('');
                }}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 text-sm font-medium"
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
