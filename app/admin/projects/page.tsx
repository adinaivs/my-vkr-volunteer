'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '../components/AdminSidebar';
import AdminNav from '../components/AdminNav';

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
  status: 'draft' | 'moderation' | 'published' | 'rejected' | 'completed' | 'blocked';
  rejectionReason?: string | null;
  publishedAt?: string | null;
  moderatedAt?: string | null;
  createdAt: string;
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'moderation' | 'published' | 'rejected' | 'all'>('moderation');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

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
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/admin/login');
      }
    };

    checkAuth();
  }, [router]);

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
    if (!confirm('Вы уверены, что хотите одобрить этот проект?')) {
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/projects/${projectId}/approve`, {
        method: 'POST',
      });

      if (response.ok) {
        alert('Проект успешно одобрен и опубликован!');
        fetchProjects();
        setShowDetailsModal(false);
        setSelectedProject(null);
      } else {
        const data = await response.json();
        alert(data.error || 'Ошибка при одобрении');
      }
    } catch (error) {
      console.error('Error approving project:', error);
      alert('Ошибка при одобрении проекта');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (projectId: string) => {
    if (!rejectReason.trim()) {
      alert('Пожалуйста, укажите причину отклонения');
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
        alert('Проект отклонен');
        fetchProjects();
        setShowDetailsModal(false);
        setSelectedProject(null);
        setRejectReason('');
      } else {
        const data = await response.json();
        alert(data.error || 'Ошибка при отклонении');
      }
    } catch (error) {
      console.error('Error rejecting project:', error);
      alert('Ошибка при отклонении проекта');
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
      case 'published':
        return (
          <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Опубликован
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
    <div className="min-h-screen bg-gray-50">
      {currentUser && (
        <>
          <AdminNav user={currentUser} />
          <AdminSidebar user={currentUser} />
        </>
      )}

      <main className="lg:ml-[272px] px-4 sm:px-6 lg:px-8 pt-20 lg:pt-[88px] pb-20 lg:pb-8">
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

          {/* Filters */}
          <div className="mb-6 flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('moderation')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'moderation'
                  ? 'bg-[#00CC00] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              На модерации
            </button>
            <button
              onClick={() => setFilter('published')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'published'
                  ? 'bg-[#00CC00] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              Опубликованные
            </button>
            <button
              onClick={() => setFilter('rejected')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'rejected'
                  ? 'bg-[#00CC00] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              Отклоненные
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-[#00CC00] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              Все
            </button>
          </div>

          {/* Projects List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00] mx-auto"></div>
            </div>
          ) : projects.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">Нет проектов для отображения</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {project.title}
                        </h3>
                        {getStatusBadge(project.status)}
                      </div>

                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {project.description}
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-500">Организатор</p>
                          <p className="font-medium text-gray-900">
                            {project.organizer.organizerProfile?.organizationName || 
                             `${project.organizer.firstName} ${project.organizer.lastName}`}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Категория</p>
                          <p className="font-medium text-gray-900">
                            {project.category.icon} {project.category.slug}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Локация</p>
                          <p className="font-medium text-gray-900">{project.location}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Волонтёры</p>
                          <p className="font-medium text-gray-900">
                            {project.currentVolunteers} / {project.maxVolunteers}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(project.startDate).toLocaleDateString('ru-RU')} - {new Date(project.endDate).toLocaleDateString('ru-RU')}
                        </div>
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Создан: {new Date(project.createdAt).toLocaleDateString('ru-RU')}
                        </div>
                      </div>

                      {/* Причина отклонения */}
                      {project.status === 'rejected' && project.rejectionReason && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-start gap-3">
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
                                {project.rejectionReason}
                              </p>
                              {project.moderatedAt && (
                                <p className="text-xs text-red-600 mt-2">
                                  Отклонено: {new Date(project.moderatedAt).toLocaleString('ru-RU')}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={() => {
                          setSelectedProject(project);
                          setShowDetailsModal(true);
                          fetchProjectTasks(project.id);
                        }}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Подробнее
                      </button>
                      
                      {project.status === 'moderation' && (
                        <>
                          <button
                            onClick={() => handleApprove(project.id)}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-[#00CC00] text-white rounded-lg hover:bg-[#00b300] transition-colors disabled:opacity-50"
                          >
                            ✓ Одобрить
                          </button>
                          <button
                            onClick={() => {
                              setSelectedProject(project);
                              setRejectReason('');
                            }}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                          >
                            ✗ Отклонить
                          </button>
                        </>
                      )}

                      {project.status === 'rejected' && (
                        <button
                          onClick={() => handleApprove(project.id)}
                          disabled={actionLoading}
                          className="px-4 py-2 bg-[#00CC00] text-white rounded-lg hover:bg-[#00b300] transition-colors disabled:opacity-50"
                        >
                          ✓ Одобрить
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Details Modal */}
      {showDetailsModal && selectedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-8 my-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
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

            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Описание</h4>
                <p className="text-gray-600">{selectedProject.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Организатор</h4>
                  <p className="text-gray-600">
                    {selectedProject.organizer.organizerProfile?.organizationName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {selectedProject.organizer.firstName} {selectedProject.organizer.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{selectedProject.organizer.email}</p>
                  <p className="text-sm text-gray-500">{selectedProject.organizer.phone}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Детали проекта</h4>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Категория:</span> {selectedProject.category.icon} {selectedProject.category.slug}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Локация:</span> {selectedProject.location}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Волонтёры:</span> {selectedProject.currentVolunteers} / {selectedProject.maxVolunteers}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Период:</span> {new Date(selectedProject.startDate).toLocaleDateString('ru-RU')} - {new Date(selectedProject.endDate).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              </div>

              {/* Задачи проекта */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Задачи проекта
                  {!loadingTasks && projectTasks.length > 0 && (
                    <span className="text-sm font-normal text-gray-500">
                      ({projectTasks.length})
                    </span>
                  )}
                </h4>
                
                {loadingTasks ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00CC00] mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Загрузка задач...</p>
                  </div>
                ) : projectTasks.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-gray-500 text-sm">Задачи не добавлены</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {projectTasks.map((task, index) => (
                      <div key={task.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-[#00CC00] transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-start gap-2 flex-1">
                            <span className="flex-shrink-0 w-6 h-6 bg-[#00CC00] text-white rounded-full flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </span>
                            <h5 className="font-medium text-gray-900">{task.title}</h5>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full font-medium flex-shrink-0 ml-2 ${getTaskStatusBadge(task.status)}`}>
                            {getTaskStatusText(task.status)}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3 ml-8">{task.description}</p>
                        
                        <div className="flex flex-wrap gap-2 text-xs ml-8">
                          {task.requiredSkill && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                              {task.requiredSkill.name}
                            </span>
                          )}
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            {task.currentVolunteers} / {task.requiredVolunteers} волонтёров
                          </span>
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full flex items-center gap-1">
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
                <div className="flex gap-3 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => handleApprove(selectedProject.id)}
                    disabled={actionLoading}
                    className="flex-1 px-6 py-3 bg-[#00CC00] text-white rounded-xl font-medium hover:bg-[#00b300] transition-colors disabled:opacity-50"
                  >
                    ✓ Одобрить проект
                  </button>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    disabled={actionLoading}
                    className="flex-1 px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    ✗ Отклонить проект
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {selectedProject && !showDetailsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Отклонить проект
            </h3>
            <p className="text-gray-600 mb-4">
              Укажите причину отклонения проекта{' '}
              <strong>{selectedProject.title}</strong>
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Причина отклонения..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00CC00] focus:border-transparent resize-none"
              rows={4}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => handleReject(selectedProject.id)}
                disabled={actionLoading || !rejectReason.trim()}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                Отклонить
              </button>
              <button
                onClick={() => {
                  setSelectedProject(null);
                  setRejectReason('');
                }}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
