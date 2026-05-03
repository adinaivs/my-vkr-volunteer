'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import OrganizerNav from '../components/OrganizerNav';
import OrganizerSidebar from '../components/OrganizerSidebar';
import AiSupportButton from '@/app/components/AiSupportButton';

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
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed' | 'draft' | 'moderation' | 'rejected'>('all');
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
  }, [activeTab, user]);

  const fetchProjects = async () => {
    if (!user) return;

    try {
      setLoadingProjects(true);
      
      // Определяем статус для фильтрации
      let statusParam = '';
      switch (activeTab) {
        case 'moderation':
          statusParam = 'moderation';
          break;
        case 'active':
          statusParam = 'published';
          break;
        case 'completed':
          statusParam = 'completed';
          break;
        case 'draft':
          statusParam = 'draft';
          break;
        case 'rejected':
          statusParam = 'rejected';
          break;
        default:
          statusParam = ''; // Все проекты
      }

      const url = statusParam 
        ? `/api/projects?status=${statusParam}&organizerId=${user.id}`
        : `/api/projects?organizerId=${user.id}`;

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
    <div className="min-h-screen bg-gray-50">
      <OrganizerSidebar user={user} />
      <OrganizerNav user={user} />

      {/* Main Content */}
      <main className="lg:ml-[272px] px-4 sm:px-6 lg:px-8 pt-20 lg:pt-[88px] pb-20 lg:pb-8">
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

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 min-w-[120px] px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'all'
                  ? 'text-[#00CC00] border-b-2 border-[#00CC00]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Все проекты
            </button>
            <button
              onClick={() => setActiveTab('moderation')}
              className={`flex-1 min-w-[120px] px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'moderation'
                  ? 'text-[#00CC00] border-b-2 border-[#00CC00]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              На модерации
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 min-w-[120px] px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'active'
                  ? 'text-[#00CC00] border-b-2 border-[#00CC00]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Активные
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`flex-1 min-w-[120px] px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'completed'
                  ? 'text-[#00CC00] border-b-2 border-[#00CC00]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Завершённые
            </button>
            <button
              onClick={() => setActiveTab('draft')}
              className={`flex-1 min-w-[120px] px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'draft'
                  ? 'text-[#00CC00] border-b-2 border-[#00CC00]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Черновики
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`flex-1 min-w-[120px] px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'rejected'
                  ? 'text-[#00CC00] border-b-2 border-[#00CC00]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Отклоненные
            </button>
          </div>

          <div className="p-8">
            {/* Loading State */}
            {loadingProjects ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00] mx-auto"></div>
                <p className="mt-4 text-gray-600">Загрузка проектов...</p>
              </div>
            ) : projects.length === 0 ? (
              /* Empty State */
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {activeTab === 'moderation' ? 'Нет проектов на модерации' :
                   activeTab === 'active' ? 'Нет активных проектов' :
                   activeTab === 'completed' ? 'Нет завершённых проектов' :
                   activeTab === 'draft' ? 'Нет черновиков' :
                   activeTab === 'rejected' ? 'Нет отклоненных проектов' :
                   'У вас пока нет проектов'}
                </h3>
                <p className="text-gray-600 max-w-md mx-auto mb-8">
                  {activeTab === 'moderation' ? 'Проекты, отправленные на модерацию, появятся здесь' :
                   activeTab === 'active' ? 'Одобренные и опубликованные проекты появятся здесь' :
                   activeTab === 'completed' ? 'Завершённые проекты появятся здесь' :
                   activeTab === 'draft' ? 'Сохранённые черновики появятся здесь' :
                   activeTab === 'rejected' ? 'Отклоненные администратором проекты появятся здесь' :
                   'Создайте свой первый волонтёрский проект и начните привлекать волонтёров для реализации ваших идей'}
                </p>
                {activeTab === 'all' && (
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
              /* Projects List */
              <div className="space-y-4">
                {projects.map((project) => (
                  <div key={project.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-gray-900">{project.title}</h3>
                          {project.status === 'moderation' && (
                            <span className="px-3 py-1 bg-orange-100 text-orange-700 text-sm font-medium rounded-full flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              На проверке
                            </span>
                          )}
                          {project.status === 'published' && (
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Опубликован
                            </span>
                          )}
                          {project.status === 'draft' && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                              Черновик
                            </span>
                          )}
                          {project.status === 'completed' && (
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                              Завершён
                            </span>
                          )}
                          {project.status === 'rejected' && (
                            <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Отклонен
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-3 line-clamp-2">{project.description}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {project.location}
                          </div>
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            {project.currentVolunteers} / {project.maxVolunteers} волонтёров
                          </div>
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(project.startDate).toLocaleDateString('ru-RU')} - {new Date(project.endDate).toLocaleDateString('ru-RU')}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Кнопка "Подробнее" */}
                    <div className="mt-4">
                      <button
                        onClick={() => handleViewDetails(project)}
                        className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Подробнее
                      </button>
                    </div>
                    
                    {/* Информация о модерации */}
                    {project.status === 'moderation' && (
                      <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-orange-900 mb-1">
                              Проект на проверке у администратора
                            </p>
                            <p className="text-sm text-orange-700">
                              Обычно проверка занимает 1-3 рабочих дня. Вы получите уведомление на email после проверки.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Информация об отклонении */}
                    {project.status === 'rejected' && (
                      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-3 mb-3">
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
                              {project.rejectionReason || 'Не указана'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditProject(project)}
                            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Редактировать
                          </button>
                          <button
                            onClick={() => handleResubmitProject(project.id)}
                            className="flex-1 px-4 py-2 bg-[#00CC00] text-white rounded-lg hover:bg-[#00b300] transition-colors flex items-center justify-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Отправить повторно
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

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

            {/* Кнопка закрытия */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedProject(null);
                  setProjectTasks([]);
                }}
                className="w-full px-4 py-2 bg-[#00CC00] text-white rounded-lg font-medium hover:bg-[#00b300] transition-colors"
              >
                Закрыть
              </button>
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
  );
}

