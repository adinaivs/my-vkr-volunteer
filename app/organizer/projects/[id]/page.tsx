'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import OrganizerNav from '../../components/OrganizerNav';
import dynamic from 'next/dynamic';
import { useToast } from '@/app/components/ToastContainer';

// Динамический импорт карты для избежания SSR проблем
const OpenStreetMap = dynamic(() => import('@/app/components/OpenStreetMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[450px] flex items-center justify-center bg-gray-100 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#00CC00] mx-auto"></div>
        <p className="mt-3 text-gray-600 text-sm">Загрузка карты...</p>
      </div>
    </div>
  )
});

interface User {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  location: string;
  latitude?: string;
  longitude?: string;
  startDate: string;
  endDate: string;
  maxVolunteers: number;
  currentVolunteers: number;
  status: string;
  rejectionReason?: string;
  category: {
    id: string;
    slug: string;
    icon: string;
  };
  organizer: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface Task {
  id: string;
  title: string;
  description: string;
  requiredSkill?: {
    id: string;
    name: string;
  };
  requiredVolunteers: number;
  currentVolunteers: number;
  deadline?: string;
  status: string;
}

interface Application {
  id: string;
  status: string;
  appliedAt: string;
  message?: string;
  volunteer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
    skills: Array<{
      id: string;
      name: string;
    }>;
  };
  task?: {
    id: string;
    title: string;
  };
}

export default function ProjectDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const toast = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingApplications, setLoadingApplications] = useState(false);
  
  const [taskSearch, setTaskSearch] = useState('');
  const [taskFilter, setTaskFilter] = useState('all');
  const [applicationSearch, setApplicationSearch] = useState('');
  const [applicationFilter, setApplicationFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'tasks' | 'applications'>('tasks');
  const [showMapModal, setShowMapModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
      } catch (error) {
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (user && projectId) {
      fetchProject();
    }
  }, [user, projectId]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/organizer/projects');
          return;
        }
        throw new Error('Ошибка загрузки проекта');
      }

      const data = await response.json();
      
      if (data.project.organizerId !== user?.id) {
        router.push('/organizer/projects');
        return;
      }

      setProject(data.project);
      
      // Загружаем задачи всегда
      await fetchTasks();
      
      // Загружаем заявки только для опубликованных проектов
      if (data.project.status === 'published') {
        await fetchApplications();
      } else {
        setApplications([]);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      router.push('/organizer/projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      setLoadingTasks(true);
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoadingTasks(false);
    }
  };

  const fetchApplications = async () => {
    try {
      setLoadingApplications(true);
      const response = await fetch(`/api/organizer/applications?projectId=${projectId}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications || []);
      } else {
        console.error('Ошибка загрузки заявок:', response.status);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoadingApplications(false);
    }
  };

  const handleApplicationAction = async (applicationId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch(`/api/organizer/applications/${applicationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: action === 'approve' ? 'approved' : 'rejected' }),
      });

      if (response.ok) {
        await fetchApplications();
        await fetchProject();
        
        const actionText = action === 'approve' ? 'одобрена' : 'отклонена';
        alert(`Заявка ${actionText}`);
      } else {
        const data = await response.json();
        alert(data.error || 'Ошибка при обработке заявки');
      }
    } catch (error) {
      console.error('Error handling application:', error);
      alert('Произошла ошибка при обработке заявки');
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;

    // Проверяем, можно ли удалить проект
    if (project.status !== 'draft' && project.status !== 'moderation') {
      toast.error('Можно удалять только черновики и проекты на модерации');
      return;
    }

    toast.confirm(
      'Вы уверены, что хотите удалить этот проект? Это действие нельзя отменить.',
      async () => {
        try {
          setDeleting(true);
          const response = await fetch(`/api/projects/${projectId}`, {
            method: 'DELETE',
            credentials: 'include'
          });

          const data = await response.json();

          if (response.ok) {
            toast.success('Проект успешно удален');
            router.push('/organizer/projects');
          } else {
            toast.error(data.error || 'Ошибка при удалении проекта');
          }
        } catch (error) {
          console.error('Error deleting project:', error);
          toast.error('Произошла ошибка при удалении проекта');
        } finally {
          setDeleting(false);
        }
      },
      'error'
    );
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      moderation: 'bg-orange-100 text-orange-700',
      published: 'bg-green-100 text-green-700',
      draft: 'bg-gray-100 text-gray-700',
      completed: 'bg-blue-100 text-blue-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return badges[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      moderation: 'На проверке',
      published: 'Опубликован',
      draft: 'Черновик',
      completed: 'Завершён',
      rejected: 'Отклонен',
    };
    return texts[status] || 'Неизвестно';
  };

  const getTaskStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      completed: 'bg-green-100 text-green-700',
      in_progress: 'bg-blue-100 text-blue-700',
      overdue: 'bg-red-100 text-red-700',
      pending: 'bg-gray-100 text-gray-700',
    };
    return badges[status] || 'bg-gray-100 text-gray-700';
  };

  const getTaskStatusText = (status: string) => {
    const texts: Record<string, string> = {
      completed: 'Завершена',
      in_progress: 'В процессе',
      overdue: 'Просрочена',
      pending: 'Ожидает',
    };
    return texts[status] || 'Неизвестно';
  };

  const getApplicationStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return badges[status] || 'bg-gray-100 text-gray-700';
  };

  const getApplicationStatusText = (status: string) => {
    const texts: Record<string, string> = {
      pending: 'Ожидает',
      approved: 'Одобрена',
      rejected: 'Отклонена',
    };
    return texts[status] || 'Неизвестно';
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
                         task.description.toLowerCase().includes(taskSearch.toLowerCase());
    const matchesFilter = taskFilter === 'all' || task.status === taskFilter;
    return matchesSearch && matchesFilter;
  });

  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      app.volunteer.firstName.toLowerCase().includes(applicationSearch.toLowerCase()) ||
      app.volunteer.lastName.toLowerCase().includes(applicationSearch.toLowerCase()) ||
      app.volunteer.email.toLowerCase().includes(applicationSearch.toLowerCase());
    const matchesFilter = applicationFilter === 'all' || app.status === applicationFilter;
    return matchesSearch && matchesFilter;
  });

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

  if (!user || !project) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      <OrganizerNav user={user} />

      <div className="container mx-auto px-6 py-8 max-w-6xl">
        <div className="mb-8">
          <Link 
            href="/organizer/projects"
            className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-[#00CC00] transition-colors group"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Назад к проектам</span>
          </Link>
          
          <nav className="flex items-center gap-2 text-sm mt-3 ml-1">
            <Link 
              href="/organizer/projects" 
              className="text-gray-500 hover:text-[#00CC00] transition-colors"
            >
              Мои проекты
            </Link>
            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-gray-900 font-medium">{project.title}</span>
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Project Info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden sticky top-6">
              {project.imageUrl && (
                <div className="relative h-48 bg-gradient-to-r from-green-100 to-green-200">
                  <img 
                    src={project.imageUrl} 
                    alt={project.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h1 className="text-2xl font-bold text-gray-900 flex-1">{project.title}</h1>
                  
                  {/* Кнопки действий для черновиков, отклоненных и проектов на модерации */}
                  <div className="flex items-center gap-2">
                    {/* Кнопка редактирования для черновиков и отклоненных проектов */}
                    {(project.status === 'draft' || project.status === 'rejected') && (
                      <Link
                        href={`/organizer/projects?edit=${project.id}`}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Редактировать проект"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Link>
                    )}
                    
                    {/* Кнопка удаления для черновиков и проектов на модерации */}
                    {(project.status === 'draft' || project.status === 'moderation') && (
                      <button
                        onClick={handleDeleteProject}
                        disabled={deleting}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Удалить проект"
                      >
                        {deleting ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-500"></div>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="mb-4">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusBadge(project.status)}`}>
                    {getStatusText(project.status)}
                  </span>
                </div>

                {project.status === 'rejected' && project.rejectionReason && (
                  <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-400 rounded-r-lg">
                    <p className="text-xs font-semibold text-red-900 mb-1">Причина отклонения:</p>
                    <p className="text-xs text-red-700">{project.rejectionReason}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Описание</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{project.description}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Категория</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{project.category.icon}</span>
                      <span className="text-sm text-gray-600">{project.category.slug}</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Местоположение</h3>
                    <p className="text-sm text-gray-600">{project.location}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Даты</h3>
                    <p className="text-sm text-gray-600">
                      {new Date(project.startDate).toLocaleDateString('ru-RU')} - {new Date(project.endDate).toLocaleDateString('ru-RU')}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Волонтёры</h3>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-[#00CC00] h-2 rounded-full transition-all"
                          style={{ width: `${(project.currentVolunteers / project.maxVolunteers) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">{project.currentVolunteers}/{project.maxVolunteers}</span>
                    </div>
                  </div>

                  {project.latitude && project.longitude && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">Карта</h3>
                      <button
                        onClick={() => setShowMapModal(true)}
                        className="w-full px-4 py-3 bg-[#00CC00] text-white rounded-lg text-sm font-medium hover:bg-[#00b300] transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        Показать на карте
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Tasks and Applications */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
              {/* Tabs Header */}
              <div className="border-b border-gray-200 bg-gray-50">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('tasks')}
                    className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                      activeTab === 'tasks'
                        ? 'bg-white text-[#00CC00] border-b-2 border-[#00CC00]'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Задачи ({filteredTasks.length})
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('applications')}
                    className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                      activeTab === 'applications'
                        ? 'bg-white text-[#00CC00] border-b-2 border-[#00CC00]'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      Заявки ({applications.length})
                    </div>
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {/* Tasks Tab */}
                {activeTab === 'tasks' && (
                  <div>
                    <div className="flex flex-col sm:flex-row gap-3 mb-6">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Поиск задач..."
                          value={taskSearch}
                          onChange={(e) => setTaskSearch(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                        />
                      </div>
                      <select
                        value={taskFilter}
                        onChange={(e) => setTaskFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                      >
                        <option value="all">Все статусы</option>
                        <option value="pending">Ожидает</option>
                        <option value="in_progress">В процессе</option>
                        <option value="completed">Завершена</option>
                        <option value="overdue">Просрочена</option>
                      </select>
                    </div>

                    {loadingTasks ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#00CC00] mx-auto"></div>
                        <p className="mt-4 text-gray-600">Загрузка задач...</p>
                      </div>
                    ) : filteredTasks.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <p className="text-gray-500 font-medium">Задачи не найдены</p>
                        <p className="text-gray-400 text-sm mt-1">Попробуйте изменить параметры поиска</p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                        {filteredTasks.map((task, index) => (
                          <div key={task.id} className="border border-gray-200 rounded-lg p-4 hover:border-[#00CC00] hover:shadow-md transition-all">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-start gap-3 flex-1">
                                <div className="w-10 h-10 bg-[#00CC00] text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                                  {index + 1}
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900 mb-1 text-lg">{task.title}</h4>
                                  <p className="text-sm text-gray-600 leading-relaxed">{task.description}</p>
                                </div>
                              </div>
                              <span className={`px-3 py-1.5 text-xs font-semibold rounded-full ${getTaskStatusBadge(task.status)}`}>
                                {getTaskStatusText(task.status)}
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              {task.requiredSkill && (
                                <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                  <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                  </svg>
                                  {task.requiredSkill.name}
                                </span>
                              )}
                              <span className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                {task.currentVolunteers}/{task.requiredVolunteers} волонтёров
                              </span>
                              {task.deadline && (
                                <span className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                                  <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  До {new Date(task.deadline).toLocaleDateString('ru-RU')}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Applications Tab */}
                {activeTab === 'applications' && (
                  <div>
                    {/* Проверяем статус проекта */}
                    {project.status !== 'published' ? (
                      <div className="text-center py-16">
                        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Заявки пока недоступны</h3>
                        <p className="text-gray-600 mb-1">
                          {project.status === 'draft' && 'Заявки будут доступны после публикации проекта'}
                          {project.status === 'moderation' && 'Заявки будут доступны после одобрения и публикации проекта'}
                          {project.status === 'rejected' && 'Проект отклонён. Исправьте замечания и отправьте на повторную модерацию'}
                          {project.status === 'completed' && 'Проект завершён'}
                        </p>
                        <p className="text-sm text-gray-500 mt-3">
                          Текущий статус: <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(project.status)}`}>
                            {getStatusText(project.status)}
                          </span>
                        </p>
                      </div>
                    ) : (
                      <>
                    <div className="flex flex-col sm:flex-row gap-3 mb-6">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Поиск по имени или email..."
                          value={applicationSearch}
                          onChange={(e) => setApplicationSearch(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                        />
                      </div>
                      <select
                        value={applicationFilter}
                        onChange={(e) => setApplicationFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                      >
                        <option value="all">Все статусы</option>
                        <option value="pending">Ожидает</option>
                        <option value="approved">Одобрена</option>
                        <option value="rejected">Отклонена</option>
                      </select>
                    </div>

                    {loadingApplications ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#00CC00] mx-auto"></div>
                        <p className="mt-4 text-gray-600">Загрузка заявок...</p>
                      </div>
                    ) : filteredApplications.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </div>
                        <p className="text-gray-500 font-medium">Заявки не найдены</p>
                        <p className="text-gray-400 text-sm mt-1">Пока нет заявок на этот проект</p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                        {filteredApplications.map((application) => (
                          <div key={application.id} className="border border-gray-200 rounded-lg p-4 hover:border-[#00CC00] hover:shadow-md transition-all">
                            <div className="flex items-start gap-4 mb-3">
                              {application.volunteer.avatarUrl ? (
                                <img 
                                  src={application.volunteer.avatarUrl} 
                                  alt={`${application.volunteer.firstName} ${application.volunteer.lastName}`}
                                  className="w-14 h-14 rounded-full object-cover border-2 border-gray-200"
                                />
                              ) : (
                                <div className="w-14 h-14 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center border-2 border-gray-200">
                                  <svg className="w-7 h-7 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <h4 className="font-semibold text-gray-900 text-lg">
                                      {application.volunteer.firstName} {application.volunteer.lastName}
                                    </h4>
                                    <p className="text-sm text-gray-600">{application.volunteer.email}</p>
                                  </div>
                                  <span className={`px-3 py-1.5 text-xs font-semibold rounded-full ${getApplicationStatusBadge(application.status)}`}>
                                    {getApplicationStatusText(application.status)}
                                  </span>
                                </div>
                                {application.task && (
                                  <p className="text-sm text-blue-600 font-medium mb-2">
                                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    Задача: {application.task.title}
                                  </p>
                                )}
                                <p className="text-xs text-gray-500">
                                  <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Подана: {new Date(application.appliedAt).toLocaleDateString('ru-RU')} в {new Date(application.appliedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>

                            {application.volunteer.skills.length > 0 && (
                              <div className="mb-3 pt-3 border-t border-gray-100">
                                <p className="text-xs text-gray-500 mb-2">Навыки:</p>
                                <div className="flex flex-wrap gap-2">
                                  {application.volunteer.skills.map((skill) => (
                                    <span key={skill.id} className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                      {skill.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {application.status === 'pending' && (
                              <div className="flex gap-3 pt-3 border-t border-gray-100">
                                <button
                                  onClick={() => handleApplicationAction(application.id, 'approve')}
                                  className="flex-1 px-4 py-2.5 bg-green-500 text-white text-sm font-semibold rounded-lg hover:bg-green-600 transition-colors shadow-sm hover:shadow-md"
                                >
                                  ✓ Одобрить
                                </button>
                                <button
                                  onClick={() => handleApplicationAction(application.id, 'reject')}
                                  className="flex-1 px-4 py-2.5 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition-colors shadow-sm hover:shadow-md"
                                >
                                  ✕ Отклонить
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map Modal */}
      {showMapModal && project.latitude && project.longitude && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowMapModal(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Местоположение проекта</h2>
                <p className="text-sm text-gray-600 mt-1">{project.location}</p>
              </div>
              <button
                onClick={() => setShowMapModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="space-y-4">
                {/* OpenStreetMap */}
                <OpenStreetMap
                  latitude={parseFloat(project.latitude)}
                  longitude={parseFloat(project.longitude)}
                  location={project.location}
                  height="350px"
                />

                {/* Location Info */}
                <div className="flex items-center gap-2 text-gray-700">
                  <svg className="w-5 h-5 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="font-medium">{project.location}</span>
                </div>

                {/* Coordinates */}
                <div className="text-sm text-gray-600">
                  Координаты: {parseFloat(project.latitude).toFixed(6)}, {parseFloat(project.longitude).toFixed(6)}
                </div>

                {/* Map Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const url = `https://www.openstreetmap.org/?mlat=${project.latitude}&mlon=${project.longitude}#map=15/${project.latitude}/${project.longitude}`;
                      window.open(url, '_blank');
                    }}
                    className="px-4 py-2 bg-[#00CC00] text-white rounded-lg text-sm font-medium hover:bg-[#00b300] transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Открыть в OpenStreetMap
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
