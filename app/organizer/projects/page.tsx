'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import OrganizerNav from '../components/OrganizerNav';
import OrganizerSidebar from '../components/OrganizerSidebar';
import AiSupportButton from '@/app/components/AiSupportButton';
import DynamicContent from '@/app/components/DynamicContent';
import { SidebarProvider } from '@/app/contexts/SidebarContext';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  requiredSkill: string;
  requiredVolunteers: number;
  deadline: string;
}

export default function OrganizerProjects() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState(1); // 1: Project Info, 2: Tasks, 3: Payment/Success
  const [projectData, setProjectData] = useState({
    title: '',
    category: '',
    description: '',
    image: null as File | null,
    startDate: '',
    endDate: '',
    location: '',
    maxVolunteers: '',
    requiredSkills: [] as string[],
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTask, setCurrentTask] = useState({
    title: '',
    description: '',
    requiredSkill: '',
    requiredVolunteers: '',
    deadline: '',
  });
  const [freePostsRemaining, setFreePostsRemaining] = useState(3); // TODO: Load from API
  const [isApproved, setIsApproved] = useState(false);
  const [categories, setCategories] = useState<Array<{id: string, slug: string, icon: string}>>([]);
  const [skills, setSkills] = useState<Array<{id: string, name: string}>>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [projectTasks, setProjectTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  
  // Новые состояния для фильтрации и отображения
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid'); // Режим отображения
  const [searchQuery, setSearchQuery] = useState(''); // Поисковый запрос
  const [filterStatus, setFilterStatus] = useState<string>('all'); // Фильтр по статусу
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'volunteers-desc' | 'volunteers-asc'>('date-desc'); // Сортировка
  const [filterCategory, setFilterCategory] = useState<string>('all'); // Фильтр по категории
  const [showFilters, setShowFilters] = useState(false); // Показать/скрыть расширенные фильтры

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
          router.push('/login');
          return;
        }
        const data = await response.json();
        if (data.user.role !== 'organizer') {
          router.push('/dashboard');
          return;
        }
        setUser(data.user);
        
        // Проверяем статус подтверждения организатора
        if (data.user.organizerProfile) {
          setIsApproved(data.user.organizerProfile.isApprovedByAdmin);
          setFreePostsRemaining(data.user.organizerProfile.freePostsRemaining || 0);
        }
        
        // Загружаем категории
        const categoriesResponse = await fetch('/api/categories');
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          setCategories(categoriesData.categories || []);
        }

        // Загружаем навыки
        const skillsResponse = await fetch('/api/skills');
        if (skillsResponse.ok) {
          const skillsData = await skillsResponse.json();
          setSkills(skillsData.skills || []);
        }
      } catch (error) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // Загрузка проектов при изменении activeTab
  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  // Функция фильтрации и сортировки проектов
  const getFilteredAndSortedProjects = () => {
    let filtered = [...projects];

    // Фильтр по поисковому запросу (по имени и описанию)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(project => 
        project.title.toLowerCase().includes(query) || 
        project.description.toLowerCase().includes(query)
      );
    }

    // Фильтр по статусу
    if (filterStatus !== 'all') {
      filtered = filtered.filter(project => project.status === filterStatus);
    }

    // Фильтр по категории
    if (filterCategory !== 'all') {
      filtered = filtered.filter(project => project.categoryId === filterCategory);
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

    return filtered;
  };

  // Функция сброса всех фильтров
  const resetFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setSortBy('date-desc');
    setFilterCategory('all');
  };

  const fetchProjects = async () => {
    if (!user) return;

    try {
      setLoadingProjects(true);
      
      // Загружаем все проекты организатора без фильтрации по статусу
      const url = `/api/projects?organizerId=${user.id}`;

      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      } else {
        console.error('Error fetching projects');
        setProjects([]);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProjectData({ ...projectData, image: e.target.files[0] });
    }
  };

  const handleAddSkill = (skill: string) => {
    if (skill && !projectData.requiredSkills.includes(skill)) {
      setProjectData({
        ...projectData,
        requiredSkills: [...projectData.requiredSkills, skill],
      });
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setProjectData({
      ...projectData,
      requiredSkills: projectData.requiredSkills.filter(s => s !== skill),
    });
  };

  const handleSaveDraft = async () => {
    try {
      // Создаем FormData для отправки файла
      const formData = new FormData();
      formData.append('title', projectData.title);
      formData.append('description', projectData.description);
      formData.append('categoryId', projectData.category);
      formData.append('startDate', projectData.startDate);
      formData.append('endDate', projectData.endDate);
      formData.append('location', projectData.location);
      formData.append('maxVolunteers', projectData.maxVolunteers);
      formData.append('isPaid', 'false');

      // Добавляем изображение, если оно есть
      if (projectData.image) {
        formData.append('image', projectData.image);
      }

      // Добавляем задачи, если они есть
      if (tasks.length > 0) {
        formData.append('tasks', JSON.stringify(tasks));
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        body: formData, // Отправляем FormData вместо JSON
      });

      const result = await response.json();

      if (!response.ok) {
        // Проверяем, если организатор не подтвержден
        if (result.code === 'ORGANIZER_NOT_APPROVED') {
          alert(result.message || 'Ваш аккаунт еще не подтвержден администратором');
          setShowCreateModal(false);
          resetForm();
          return;
        }
        
        alert(result.error || 'Ошибка при сохранении черновика');
        return;
      }

      alert('Проект сохранён как черновик');
      setShowCreateModal(false);
      resetForm();
      
      // Перезагружаем страницу, чтобы показать новый проект
      window.location.reload();
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Произошла ошибка при сохранении черновика');
    }
  };

  const handleNextStep = () => {
    if (createStep === 1) {
      // Validate project data
      if (!projectData.title || !projectData.category || !projectData.description) {
        alert('Пожалуйста, заполните все обязательные поля');
        return;
      }
      setCreateStep(2);
    } else if (createStep === 2) {
      // Move to payment/success step
      setCreateStep(3);
    }
  };

  const handleAddTask = () => {
    if (!currentTask.title || !currentTask.description) {
      alert('Пожалуйста, заполните название и описание задачи');
      return;
    }

    const newTask: Task = {
      id: Date.now().toString(),
      title: currentTask.title,
      description: currentTask.description,
      requiredSkill: currentTask.requiredSkill,
      requiredVolunteers: parseInt(currentTask.requiredVolunteers) || 1,
      deadline: currentTask.deadline,
    };

    setTasks([...tasks, newTask]);
    setCurrentTask({
      title: '',
      description: '',
      requiredSkill: '',
      requiredVolunteers: '',
      deadline: '',
    });
  };

  const handleRemoveTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
  };

  const handleSubmitProject = async () => {
    try {
      // Создаем FormData для отправки файла
      const formData = new FormData();
      formData.append('title', projectData.title);
      formData.append('description', projectData.description);
      formData.append('categoryId', projectData.category);
      formData.append('startDate', projectData.startDate);
      formData.append('endDate', projectData.endDate);
      formData.append('location', projectData.location);
      formData.append('maxVolunteers', projectData.maxVolunteers);
      formData.append('isPaid', 'false');

      // Добавляем изображение, если оно есть
      if (projectData.image) {
        formData.append('image', projectData.image);
      }

      // Добавляем задачи, если они есть
      if (tasks.length > 0) {
        formData.append('tasks', JSON.stringify(tasks));
      }

      // Создаем проект
      const projectResponse = await fetch('/api/projects', {
        method: 'POST',
        body: formData, // Отправляем FormData вместо JSON
      });

      const projectResult = await projectResponse.json();

      if (!projectResponse.ok) {
        // Проверяем, если организатор не подтвержден
        if (projectResult.code === 'ORGANIZER_NOT_APPROVED') {
          alert(projectResult.message || 'Ваш аккаунт еще не подтвержден администратором');
          setShowCreateModal(false);
          resetForm();
          return;
        }
        
        alert(projectResult.error || 'Ошибка при создании проекта');
        return;
      }

      const projectId = projectResult.project.id;

      // Затем отправляем проект на модерацию
      const publishResponse = await fetch(`/api/projects/${projectId}/publish`, {
        method: 'POST',
      });

      const publishResult = await publishResponse.json();

      if (!publishResponse.ok) {
        alert(publishResult.error || 'Ошибка при отправке на модерацию');
        return;
      }

      alert('Проект успешно отправлен на модерацию! Администратор проверит его в течение 1-3 дней.');
      setShowCreateModal(false);
      resetForm();
      
      // Перезагружаем страницу, чтобы показать новый проект
      window.location.reload();
    } catch (error) {
      console.error('Error submitting project:', error);
      alert('Произошла ошибка при отправке проекта');
    }
  };

  const resetForm = () => {
    setCreateStep(1);
    setProjectData({
      title: '',
      category: '',
      description: '',
      image: null,
      startDate: '',
      endDate: '',
      location: '',
      maxVolunteers: '',
      requiredSkills: [],
    });
    setTasks([]);
    setCurrentTask({
      title: '',
      description: '',
      requiredSkill: '',
      requiredVolunteers: '',
      deadline: '',
    });
  };

  const handleResubmitProject = async (projectId: string) => {
    if (!confirm('Отправить проект на модерацию повторно? Убедитесь, что вы внесли все необходимые изменения.')) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/resubmit`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        alert('Проект успешно отправлен на модерацию! Администратор проверит его в течение 1-3 дней.');
        fetchProjects(); // Перезагружаем список проектов
      } else {
        alert(data.error || 'Ошибка при отправке проекта на модерацию');
      }
    } catch (error) {
      console.error('Error resubmitting project:', error);
      alert('Произошла ошибка при отправке проекта');
    }
  };

  const handlePublishDraft = async (projectId: string) => {
    if (!confirm('Отправить черновик на модерацию? Убедитесь, что все данные заполнены корректно.')) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/publish`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        alert('Проект успешно отправлен на модерацию! Администратор проверит его в течение 1-3 дней.');
        fetchProjects(); // Перезагружаем список проектов
      } else {
        alert(data.error || 'Ошибка при отправке проекта на модерацию');
      }
    } catch (error) {
      console.error('Error publishing draft:', error);
      alert('Произошла ошибка при отправке проекта');
    }
  };

  const handleEditProject = async (project: any) => {
    // Загружаем полные данные проекта
    try {
      const response = await fetch(`/api/projects/${project.id}`);
      if (response.ok) {
        const data = await response.json();
        setEditingProject(data.project);
        
        // Заполняем форму данными проекта
        setProjectData({
          title: data.project.title,
          category: data.project.categoryId,
          description: data.project.description,
          image: null, // Изображение не загружаем, только если пользователь выберет новое
          startDate: new Date(data.project.startDate).toISOString().split('T')[0],
          endDate: new Date(data.project.endDate).toISOString().split('T')[0],
          location: data.project.location,
          maxVolunteers: data.project.maxVolunteers.toString(),
          requiredSkills: [],
        });
        
        setShowEditModal(true);
      }
    } catch (error) {
      console.error('Error loading project:', error);
      alert('Ошибка при загрузке данных проекта');
    }
  };

  const handleUpdateProject = async () => {
    if (!editingProject) return;

    try {
      // Создаем FormData для отправки файла
      const formData = new FormData();
      formData.append('title', projectData.title);
      formData.append('description', projectData.description);
      formData.append('categoryId', projectData.category);
      formData.append('startDate', projectData.startDate);
      formData.append('endDate', projectData.endDate);
      formData.append('location', projectData.location);
      formData.append('maxVolunteers', projectData.maxVolunteers);

      // Добавляем изображение, если оно есть
      if (projectData.image) {
        formData.append('image', projectData.image);
      }

      const response = await fetch(`/api/projects/${editingProject.id}`, {
        method: 'PUT',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || 'Ошибка при обновлении проекта');
        return;
      }

      alert('Проект успешно обновлен! Теперь вы можете отправить его на модерацию.');
      setShowEditModal(false);
      setEditingProject(null);
      resetForm();
      fetchProjects(); // Перезагружаем список проектов
    } catch (error) {
      console.error('Error updating project:', error);
      alert('Произошла ошибка при обновлении проекта');
    }
  };

  const handleViewDetails = async (project: any) => {
    setSelectedProject(project);
    setShowDetailsModal(true);
    
    // Загружаем задачи проекта
    await fetchProjectTasks(project.id);
  };

  const fetchProjectTasks = async (projectId: string) => {
    try {
      setLoadingTasks(true);
      const response = await fetch(`/api/projects/${projectId}/tasks`);
      if (response.ok) {
        const data = await response.json();
        setProjectTasks(data.tasks || []);
      } else {
        setProjectTasks([]);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setProjectTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  };

  const getTaskStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      case 'overdue':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getTaskStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Завершена';
      case 'in_progress':
        return 'В процессе';
      case 'overdue':
        return 'Просрочена';
      case 'pending':
        return 'Ожидает';
      default:
        return 'Неизвестно';
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

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50">
        <OrganizerSidebar user={user} />
        <OrganizerNav user={user} />

        {/* Main Content */}
        <DynamicContent>
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Мои проекты</h1>
            <p className="text-gray-600">Управляйте своими волонтёрскими проектами</p>
          </div>
          <button
            onClick={() => {
              // Проверяем, подтвержден ли организатор
              if (!isApproved) {
                alert('Ваш аккаунт еще не подтвержден администратором. Для создания проектов необходимо дождаться подтверждения вашего аккаунта. Обычно это занимает 1-2 рабочих дня.');
                return;
              }
              setShowCreateModal(true);
            }}
            className="px-6 py-3 bg-[#00CC00] text-white rounded-full font-medium hover:bg-[#00b300] transition-colors flex items-center gap-2 shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Создать проект
          </button>
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
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent text-sm"
                  >
                    <option value="all">Все</option>
                    <option value="moderation">На модерации</option>
                    <option value="published">Активные</option>
                    <option value="completed">Завершенные</option>
                    <option value="draft">Черновики</option>
                    <option value="rejected">Отклоненные</option>
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
                    <option value="volunteers-desc">Волонтёры: по убыванию</option>
                    <option value="volunteers-asc">Волонтёры: по возрастанию</option>
                  </select>
                </div>

                {/* Фильтр по категории */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Категория
                  </label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent text-sm"
                  >
                    <option value="all">Все категории</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.slug}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Список проектов без контейнера */}
        {/* Loading State */}
        {loadingProjects ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00] mx-auto"></div>
            <p className="mt-4 text-gray-600">Загрузка проектов...</p>
          </div>
        ) : getFilteredAndSortedProjects().length === 0 ? (
          /* Empty State */
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              {searchQuery || filterStatus !== 'all' || filterCategory !== 'all' 
                ? 'Проекты не найдены' 
                : 'У вас пока нет проектов'}
            </h3>
            <p className="text-gray-600 max-w-md mx-auto mb-8">
              {searchQuery || filterStatus !== 'all' || filterCategory !== 'all'
                ? 'Попробуйте изменить параметры поиска или фильтры'
                : 'Создайте свой первый волонтёрский проект и начните привлекать волонтёров для реализации ваших идей'}
            </p>
            {!searchQuery && filterStatus === 'all' && filterCategory === 'all' && (
              <button
                onClick={() => {
                  if (!isApproved) {
                    alert('Ваш аккаунт еще не подтвержден администратором. Для создания проектов необходимо дождаться подтверждения вашего аккаунта. Обычно это занимает 1-2 рабочих дня.');
                    return;
                  }
                  setShowCreateModal(true);
                }}
                className="inline-block px-8 py-3 bg-[#00CC00] text-white rounded-full font-medium hover:bg-[#00b300] transition-colors"
              >
                Создать первый проект
              </button>
            )}
          </div>
        ) : (
          /* Projects List/Grid */
          <div>
            {/* Режим списка */}
            {viewMode === 'list' && (
              <div className="space-y-3">
                {getFilteredAndSortedProjects().map((project) => (
                  <div 
                    key={project.id} 
                    className="bg-white border border-gray-300 rounded-lg p-4 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer"
                    onClick={() => handleViewDetails(project)}
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
                          {project.status === 'moderation' && (
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full flex-shrink-0">
                              На проверке
                            </span>
                          )}
                          {project.status === 'published' && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full flex-shrink-0">
                              Опубликован
                            </span>
                          )}
                          {project.status === 'draft' && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full flex-shrink-0">
                              Черновик
                            </span>
                          )}
                          {project.status === 'completed' && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full flex-shrink-0">
                              Завершён
                            </span>
                          )}
                          {project.status === 'rejected' && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full flex-shrink-0">
                              Отклонен
                            </span>
                          )}
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
                    onClick={() => handleViewDetails(project)}
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
                        {project.status === 'moderation' && (
                          <span className="px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full whitespace-nowrap">
                            На проверке
                          </span>
                        )}
                        {project.status === 'published' && (
                          <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full whitespace-nowrap">
                            Опубликован
                          </span>
                        )}
                        {project.status === 'draft' && (
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full whitespace-nowrap">
                            Черновик
                          </span>
                        )}
                        {project.status === 'completed' && (
                          <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full whitespace-nowrap">
                            Завершён
                          </span>
                        )}
                        {project.status === 'rejected' && (
                          <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full whitespace-nowrap">
                            Отклонен
                          </span>
                        )}
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
          </div>
        )}
      </DynamicContent>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => {
            if (createStep === 1) {
              setShowCreateModal(false);
              resetForm();
            }
          }}
        >
          <div 
            className="bg-white rounded-2xl p-8 max-w-4xl w-full shadow-2xl transform transition-all my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Step Indicator */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4 flex-1">
                <div className={`flex items-center gap-2 ${createStep >= 1 ? 'text-[#00CC00]' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    createStep >= 1 ? 'bg-[#00CC00] text-white' : 'bg-gray-200'
                  }`}>
                    1
                  </div>
                  <span className="text-sm font-medium hidden sm:block">Информация</span>
                </div>
                <div className={`h-0.5 flex-1 ${createStep >= 2 ? 'bg-[#00CC00]' : 'bg-gray-200'}`}></div>
                <div className={`flex items-center gap-2 ${createStep >= 2 ? 'text-[#00CC00]' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    createStep >= 2 ? 'bg-[#00CC00] text-white' : 'bg-gray-200'
                  }`}>
                    2
                  </div>
                  <span className="text-sm font-medium hidden sm:block">Задачи</span>
                </div>
                <div className={`h-0.5 flex-1 ${createStep >= 3 ? 'bg-[#00CC00]' : 'bg-gray-200'}`}></div>
                <div className={`flex items-center gap-2 ${createStep >= 3 ? 'text-[#00CC00]' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    createStep >= 3 ? 'bg-[#00CC00] text-white' : 'bg-gray-200'
                  }`}>
                    3
                  </div>
                  <span className="text-sm font-medium hidden sm:block">Публикация</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="ml-4 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Step 1: Project Information */}
            {createStep === 1 && (
              <div className="max-h-[70vh] overflow-y-auto pr-2">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Информация о проекте</h3>
                
                <div className="space-y-6">
                  {/* Project Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Название проекта *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Например: Помощь детскому дому"
                      value={projectData.title}
                      onChange={(e) => setProjectData({ ...projectData, title: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Категория проекта *
                    </label>
                    <select 
                      value={projectData.category}
                      onChange={(e) => setProjectData({ ...projectData, category: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                    >
                      <option value="">Выберите категорию</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.slug}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Описание проекта *
                    </label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Опишите цели, задачи и ожидаемые результаты проекта..."
                      value={projectData.description}
                      onChange={(e) => setProjectData({ ...projectData, description: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent resize-none"
                    />
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Фотография проекта
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="flex-1 cursor-pointer">
                        <div className="w-full px-4 py-3 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl hover:border-[#00CC00] transition-colors flex items-center justify-center gap-2">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm text-gray-600">
                            {projectData.image ? projectData.image.name : 'Выберите изображение'}
                          </span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Дата начала *
                      </label>
                      <input
                        type="date"
                        required
                        value={projectData.startDate}
                        onChange={(e) => setProjectData({ ...projectData, startDate: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Дата окончания *
                      </label>
                      <input
                        type="date"
                        required
                        value={projectData.endDate}
                        onChange={(e) => setProjectData({ ...projectData, endDate: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Локация *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Например: Бишкек, ул. Чуй 123"
                      value={projectData.location}
                      onChange={(e) => setProjectData({ ...projectData, location: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                    />
                  </div>

                  {/* Max Volunteers */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Максимальное количество волонтёров *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="Например: 10"
                      value={projectData.maxVolunteers}
                      onChange={(e) => setProjectData({ ...projectData, maxVolunteers: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                    />
                  </div>

                  {/* Required Skills */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Требуемые навыки
                    </label>
                    <div className="flex gap-2 mb-3">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddSkill(e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                      >
                        <option value="">Выберите навык</option>
                        {skills.map((skill) => (
                          <option key={skill.id} value={skill.name}>
                            {skill.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {projectData.requiredSkills.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {projectData.requiredSkills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-[#00CC00]/10 text-[#00CC00] rounded-full text-sm font-medium"
                          >
                            {skill}
                            <button
                              onClick={() => handleRemoveSkill(skill)}
                              className="hover:opacity-70"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    Сохранить как черновик
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex-1 px-6 py-3 bg-[#00CC00] text-white rounded-xl font-medium hover:bg-[#00b300] transition-colors"
                  >
                    Далее →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Tasks */}
            {createStep === 2 && (
              <div className="max-h-[70vh] overflow-y-auto pr-2">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Задачи проекта</h3>
                <p className="text-gray-600 mb-6">Добавьте задачи, которые нужно выполнить в рамках проекта</p>

                {/* Task List */}
                {tasks.length > 0 && (
                  <div className="mb-6 space-y-3">
                    {tasks.map((task) => (
                      <div key={task.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900 mb-1">{task.title}</h4>
                            <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                            <div className="flex flex-wrap gap-2 text-xs">
                              {task.requiredSkill && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                                  {task.requiredSkill}
                                </span>
                              )}
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                                {task.requiredVolunteers} волонтёр(ов)
                              </span>
                              {task.deadline && (
                                <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                                  До {new Date(task.deadline).toLocaleDateString('ru-RU')}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveTask(task.id)}
                            className="ml-4 text-red-500 hover:text-red-700"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Task Form */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
                  <h4 className="font-bold text-gray-900 mb-4">Добавить задачу</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Название задачи *
                      </label>
                      <input
                        type="text"
                        placeholder="Например: Уборка территории"
                        value={currentTask.title}
                        onChange={(e) => setCurrentTask({ ...currentTask, title: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Описание задачи *
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Опишите, что нужно сделать..."
                        value={currentTask.description}
                        onChange={(e) => setCurrentTask({ ...currentTask, description: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Требуемый навык
                        </label>
                        <select
                          value={currentTask.requiredSkill}
                          onChange={(e) => setCurrentTask({ ...currentTask, requiredSkill: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                        >
                          <option value="">Не требуется</option>
                          {skills.map((skill) => (
                            <option key={skill.id} value={skill.name}>
                              {skill.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Количество волонтёров *
                        </label>
                        <input
                          type="number"
                          min="1"
                          placeholder="1"
                          value={currentTask.requiredVolunteers}
                          onChange={(e) => setCurrentTask({ ...currentTask, requiredVolunteers: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Дедлайн
                        </label>
                        <input
                          type="date"
                          value={currentTask.deadline}
                          onChange={(e) => setCurrentTask({ ...currentTask, deadline: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddTask}
                      className="w-full px-4 py-3 bg-[#00CC00] text-white rounded-xl font-medium hover:bg-[#00b300] transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Добавить задачу
                    </button>
                  </div>
                </div>

                {tasks.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-sm">Добавьте хотя бы одну задачу для проекта</p>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setCreateStep(1)}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    ← Назад
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    Сохранить как черновик
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    disabled={tasks.length === 0}
                    className="px-6 py-3 bg-[#00CC00] text-white rounded-xl font-medium hover:bg-[#00b300] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Далее →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Payment/Success */}
            {createStep === 3 && (
              <div className="max-h-[70vh] overflow-y-auto pr-2">
                {freePostsRemaining > 0 ? (
                  // Has free posts
                  <div className="text-center py-8">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Готово к публикации!</h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Проект "{projectData.title}" готов к отправке на модерацию
                    </p>

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6 max-w-md mx-auto">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-gray-900">Бесплатные публикации</div>
                          <div className="text-sm text-gray-600">Осталось: {freePostsRemaining} из 3</div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700">
                        Вы используете бесплатную публикацию. После использования всех бесплатных публикаций, 
                        следующие проекты будут платными.
                      </p>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8 max-w-md mx-auto text-left">
                      <h4 className="font-bold text-gray-900 mb-3">⏳ Что дальше?</h4>
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-start gap-2">
                          <span className="text-yellow-600">•</span>
                          <span>Администратор проверит проект в течение 1-3 дней</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-yellow-600">•</span>
                          <span>При одобрении проект станет доступен волонтёрам</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-yellow-600">•</span>
                          <span>При отклонении вы получите уведомление с причиной</span>
                        </li>
                      </ul>
                    </div>

                    <div className="flex gap-3 justify-center">
                      <button
                        type="button"
                        onClick={() => setCreateStep(2)}
                        className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                      >
                        ← Назад
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmitProject}
                        className="px-8 py-3 bg-[#00CC00] text-white rounded-xl font-bold hover:bg-[#00b300] transition-colors shadow-lg"
                      >
                        Отправить на модерацию
                      </button>
                    </div>
                  </div>
                ) : (
                  // No free posts - Payment required
                  <div className="text-center py-8">
                    <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Требуется оплата</h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Вы использовали все бесплатные публикации. Для публикации этого проекта необходимо оплатить размещение.
                    </p>

                    <div className="bg-white border-2 border-[#00CC00] rounded-2xl p-8 mb-8 max-w-md mx-auto">
                      <div className="text-4xl font-bold text-gray-900 mb-2">500 сом</div>
                      <div className="text-sm text-gray-600 mb-6">за публикацию проекта</div>
                      
                      <div className="space-y-3 text-left mb-6">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <svg className="w-5 h-5 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Проект будет активен 30 дней
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <svg className="w-5 h-5 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Доступ к базе волонтёров
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <svg className="w-5 h-5 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Приоритетная модерация
                        </div>
                      </div>

                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                        <p className="text-sm text-yellow-800">
                          💡 Функция оплаты находится в разработке. Скоро вы сможете оплачивать публикации онлайн.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 justify-center">
                      <button
                        type="button"
                        onClick={() => setCreateStep(2)}
                        className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                      >
                        ← Назад
                      </button>
                      <button
                        type="button"
                        disabled
                        className="px-8 py-3 bg-gray-300 text-gray-500 rounded-xl font-bold cursor-not-allowed"
                      >
                        Оплатить (скоро)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Support Button */}
      <AiSupportButton />

      {/* Project Details Modal */}
      {showDetailsModal && selectedProject && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => {
            setShowDetailsModal(false);
            setSelectedProject(null);
            setProjectTasks([]);
          }}
        >
          <div 
            className="bg-white rounded-xl p-6 max-w-3xl w-full shadow-2xl transform transition-all my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Заголовок */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Детали проекта</h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedProject(null);
                  setProjectTasks([]);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto pr-2">
              {/* Изображение проекта */}
              {selectedProject.imageUrl && (
                <div className="mb-4">
                  <img 
                    src={selectedProject.imageUrl} 
                    alt={selectedProject.title}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
              )}

              {/* Основная информация */}
              <div className="space-y-3 mb-4">
                <div>
                  <h4 className="text-xs font-medium text-gray-500 mb-1">Название</h4>
                  <p className="text-base font-semibold text-gray-900">{selectedProject.title}</p>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-gray-500 mb-1">Описание</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedProject.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 mb-1">Локация</h4>
                    <div className="flex items-center gap-1.5 text-sm text-gray-700">
                      <svg className="w-3.5 h-3.5 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {selectedProject.location}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-medium text-gray-500 mb-1">Волонтёры</h4>
                    <div className="flex items-center gap-1.5 text-sm text-gray-700">
                      <svg className="w-3.5 h-3.5 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      {selectedProject.currentVolunteers} / {selectedProject.maxVolunteers}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-medium text-gray-500 mb-1">Начало</h4>
                    <div className="flex items-center gap-1.5 text-sm text-gray-700">
                      <svg className="w-3.5 h-3.5 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date(selectedProject.startDate).toLocaleDateString('ru-RU')}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-medium text-gray-500 mb-1">Окончание</h4>
                    <div className="flex items-center gap-1.5 text-sm text-gray-700">
                      <svg className="w-3.5 h-3.5 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date(selectedProject.endDate).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-gray-500 mb-1">Статус</h4>
                  <div>
                    {selectedProject.status === 'moderation' && (
                      <span className="px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full inline-flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        На проверке
                      </span>
                    )}
                    {selectedProject.status === 'published' && (
                      <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full inline-flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Опубликован
                      </span>
                    )}
                    {selectedProject.status === 'draft' && (
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                        Черновик
                      </span>
                    )}
                    {selectedProject.status === 'completed' && (
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                        Завершён
                      </span>
                    )}
                    {selectedProject.status === 'rejected' && (
                      <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full inline-flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Отклонен
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Задачи проекта */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Задачи проекта
                </h4>

                {loadingTasks ? (
                  <div className="text-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#00CC00] mx-auto"></div>
                    <p className="mt-2 text-xs text-gray-600">Загрузка...</p>
                  </div>
                ) : projectTasks.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-gray-500 text-xs">Задачи не добавлены</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {projectTasks.map((task, index) => (
                      <div key={task.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex items-start justify-between mb-1.5">
                          <div className="flex items-start gap-2 flex-1">
                            <span className="flex-shrink-0 w-5 h-5 bg-[#00CC00] text-white rounded-full flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </span>
                            <div className="flex-1">
                              <h5 className="text-sm font-medium text-gray-900">{task.title}</h5>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getTaskStatusBadge(task.status)}`}>
                            {getTaskStatusText(task.status)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mb-2 ml-7">{task.description}</p>
                        <div className="flex flex-wrap gap-1.5 text-xs ml-7">
                          {task.requiredSkill && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                              {task.requiredSkill.name}
                            </span>
                          )}
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                            {task.currentVolunteers}/{task.requiredVolunteers} волонтёров
                          </span>
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                            До {new Date(task.deadline).toLocaleDateString('ru-RU')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Кнопки действий */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-col gap-2">
                {/* Кнопки для отклоненных проектов */}
                {selectedProject.status === 'rejected' && (
                  <>
                    <div className="mb-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-xs font-medium text-red-900 mb-1">Причина отклонения:</p>
                      <p className="text-sm text-red-700">{selectedProject.rejectionReason || 'Не указана'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDetailsModal(false);
                          handleEditProject(selectedProject);
                        }}
                        className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDetailsModal(false);
                          handleResubmitProject(selectedProject.id);
                        }}
                        className="flex-1 px-4 py-2 bg-[#00CC00] text-white rounded-lg font-medium hover:bg-[#00b300] transition-colors"
                      >
                        Отправить повторно
                      </button>
                    </div>
                  </>
                )}

                {/* Кнопки для черновиков */}
                {selectedProject.status === 'draft' && (
                  <>
                    <div className="mb-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-sm text-gray-700">Черновик проекта. Отредактируйте и опубликуйте его.</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDetailsModal(false);
                          handleEditProject(selectedProject);
                        }}
                        className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDetailsModal(false);
                          handlePublishDraft(selectedProject.id);
                        }}
                        className="flex-1 px-4 py-2 bg-[#00CC00] text-white rounded-lg font-medium hover:bg-[#00b300] transition-colors"
                      >
                        Опубликовать
                      </button>
                    </div>
                  </>
                )}

                {/* Кнопка закрытия для всех остальных статусов */}
                {selectedProject.status !== 'rejected' && selectedProject.status !== 'draft' && (
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setSelectedProject(null);
                      setProjectTasks([]);
                    }}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    Закрыть
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditModal && editingProject && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => {
            setShowEditModal(false);
            setEditingProject(null);
            resetForm();
          }}
        >
          <div 
            className="bg-white rounded-2xl p-8 max-w-4xl w-full shadow-2xl transform transition-all my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Редактировать проект</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingProject(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto pr-2">
              <div className="space-y-6">
                {/* Project Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Название проекта *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Например: Помощь детскому дому"
                    value={projectData.title}
                    onChange={(e) => setProjectData({ ...projectData, title: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Категория проекта *
                  </label>
                  <select 
                    value={projectData.category}
                    onChange={(e) => setProjectData({ ...projectData, category: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                  >
                    <option value="">Выберите категорию</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.slug}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Описание проекта *
                  </label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Опишите цели, задачи и ожидаемые результаты проекта..."
                    value={projectData.description}
                    onChange={(e) => setProjectData({ ...projectData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent resize-none"
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Фотография проекта
                  </label>
                  {editingProject.imageUrl && !projectData.image && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 mb-2">Текущее изображение:</p>
                      <img 
                        src={editingProject.imageUrl} 
                        alt="Текущее изображение проекта" 
                        className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <label className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm text-gray-600">
                          {projectData.image ? projectData.image.name : 'Выберите новое изображение (необязательно)'}
                        </span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Дата начала *
                    </label>
                    <input
                      type="date"
                      required
                      value={projectData.startDate}
                      onChange={(e) => setProjectData({ ...projectData, startDate: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Дата окончания *
                    </label>
                    <input
                      type="date"
                      required
                      value={projectData.endDate}
                      onChange={(e) => setProjectData({ ...projectData, endDate: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Локация *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Например: Бишкек, ул. Чуй 123"
                    value={projectData.location}
                    onChange={(e) => setProjectData({ ...projectData, location: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                  />
                </div>

                {/* Max Volunteers */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Максимальное количество волонтёров *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Например: 10"
                    value={projectData.maxVolunteers}
                    onChange={(e) => setProjectData({ ...projectData, maxVolunteers: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Info Box */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      Внесите необходимые изменения
                    </p>
                    <p className="text-sm text-blue-700">
                      После сохранения изменений вы сможете отправить проект на модерацию повторно.
                    </p>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingProject(null);
                    resetForm();
                  }}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleUpdateProject}
                  className="flex-1 px-6 py-3 bg-[#00CC00] text-white rounded-xl font-medium hover:bg-[#00b300] transition-colors"
                >
                  Сохранить изменения
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </SidebarProvider>
  );
}

