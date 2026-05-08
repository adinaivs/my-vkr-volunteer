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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'applications'>('active');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingApplications, setLoadingApplications] = useState(false);

  // Report Modal States
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MyTask | null>(null);
  const [reportDescription, setReportDescription] = useState('');
  const [reportPhotos, setReportPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState(false);

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
      } catch (error) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (user) {
      if (activeTab === 'applications') {
        fetchApplications();
      } else {
        fetchProjects();
      }
    }
  }, [user, activeTab]);

  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      const type = activeTab === 'active' ? 'active' : 'completed';
      const response = await fetch(`/api/volunteer/my-projects?type=${type}`, {
        credentials: 'include',
      });
      
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
      const response = await fetch('/api/volunteer/applications', {
        credentials: 'include',
      });
      
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

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      recruiting: { bg: 'bg-green-100', text: 'text-green-700', label: 'Набор волонтеров' },
      upcoming: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Скоро начнется' },
      active: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Активный' },
      completed: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Завершён' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Отменен' },
    };
    return badges[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Неизвестно' };
  };

  const getApplicationStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Ожидает' },
      approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Одобрена' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Отклонена' },
    };
    return badges[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Неизвестно' };
  };

  const getTaskAssignmentStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string; icon: string }> = {
      assigned: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Назначена', icon: '📋' },
      completed: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Выполнена', icon: '✓' },
      confirmed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Подтверждена', icon: '✓✓' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Отклонена', icon: '✗' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Отменена', icon: '⊘' },
    };
    return badges[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Неизвестно', icon: '?' };
  };

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setShowProjectDetails(true);
  };

  const closeProjectDetails = () => {
    setShowProjectDetails(false);
    setSelectedProject(null);
    // Разблокируем скролл
    document.body.style.overflow = 'unset';
  };

  // Блокируем скролл при открытии модального окна
  useEffect(() => {
    if (showProjectDetails || showReportModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showProjectDetails, showReportModal]);

  const openReportModal = (task: MyTask) => {
    setSelectedTask(task);
    setReportDescription('');
    setReportPhotos([]);
    setReportError(null);
    setReportSuccess(false);
    setShowReportModal(true);
  };

  const closeReportModal = () => {
    setShowReportModal(false);
    setSelectedTask(null);
    setReportDescription('');
    setReportPhotos([]);
    setReportError(null);
    setReportSuccess(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhoto(true);
    setReportError(null);

    try {
      // Проверяем количество файлов
      if (files.length > 10) {
        setReportError('Можно загрузить максимум 10 фотографий');
        setUploadingPhoto(false);
        return;
      }

      // Проверяем размер и тип каждого файла
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) {
          setReportError('Размер каждого файла не должен превышать 5MB');
          setUploadingPhoto(false);
          return;
        }

        if (!file.type.startsWith('image/')) {
          setReportError('Можно загружать только изображения');
          setUploadingPhoto(false);
          return;
        }
      }

      // Загружаем фотографии в S3
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('photos', file);
      });

      const response = await fetch('/api/upload/report-photos', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при загрузке фотографий');
      }

      const data = await response.json();
      setReportPhotos([...reportPhotos, ...data.urls]);
      toast.success(`Загружено ${data.urls.length} фотографий`);
    } catch (err) {
      console.error('Error uploading photos:', err);
      setReportError(err instanceof Error ? err.message : 'Ошибка при загрузке фотографий');
      toast.error(err instanceof Error ? err.message : 'Ошибка при загрузке фотографий');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = (index: number) => {
    setReportPhotos(reportPhotos.filter((_, i) => i !== index));
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTask || !selectedTask.assignments[0]) {
      setReportError('Задание не найдено');
      return;
    }

    if (!reportDescription.trim()) {
      setReportError('Введите описание выполненной работы');
      return;
    }

    if (reportPhotos.length === 0) {
      setReportError('Загрузите хотя бы одну фотографию');
      return;
    }

    setSubmittingReport(true);
    setReportError(null);

    try {
      const assignmentId = selectedTask.assignments[0].id;
      const response = await fetch(`/api/volunteer/tasks/${assignmentId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: reportDescription,
          photos: reportPhotos,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setReportError(data.error || 'Ошибка при отправке отчёта');
        return;
      }

      setReportSuccess(true);
      
      // Обновляем список проектов
      setTimeout(() => {
        closeReportModal();
        fetchProjects();
      }, 2000);
    } catch (err) {
      setReportError('Ошибка при отправке отчёта');
    } finally {
      setSubmittingReport(false);
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
        <VolunteerSidebar user={user} />
        <VolunteerNav user={user} />

        <DynamicContent>
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Мои проекты</h1>
            <p className="text-gray-600">Управляйте своими проектами и заявками</p>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 mb-6">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('active')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                  activeTab === 'active'
                    ? 'text-[#00CC00] border-b-2 border-[#00CC00] bg-green-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Активные проекты
                </div>
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                  activeTab === 'completed'
                    ? 'text-[#00CC00] border-b-2 border-[#00CC00] bg-green-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Завершённые
                </div>
              </button>
              <button
                onClick={() => setActiveTab('applications')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                  activeTab === 'applications'
                    ? 'text-[#00CC00] border-b-2 border-[#00CC00] bg-green-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Мои заявки
                </div>
              </button>
            </div>

            <div className="p-6">
              {/* Active/Completed Projects */}
              {(activeTab === 'active' || activeTab === 'completed') && (
                <>
                  {loadingProjects ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#00CC00] mx-auto"></div>
                      <p className="mt-4 text-gray-600">Загрузка проектов...</p>
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {activeTab === 'active' ? 'У вас пока нет активных проектов' : 'Нет завершённых проектов'}
                      </h3>
                      <p className="text-gray-600 mb-6">
                        {activeTab === 'active' 
                          ? 'Найдите интересный проект и подайте заявку на участие' 
                          : 'Здесь будут отображаться проекты, которые вы завершили'}
                      </p>
                      {activeTab === 'active' && (
                        <Link 
                          href="/volunteer/projects"
                          className="inline-block px-6 py-3 bg-[#00CC00] text-white rounded-xl font-semibold hover:bg-[#00b300] transition-colors shadow-lg"
                        >
                          Найти проект
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {projects.map((project) => {
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
                            {/* Project Image */}
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

                            <div className="p-5">
                              {/* Title and Status */}
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <h3 className="text-lg font-bold text-gray-900 line-clamp-2 flex-1 group-hover:text-[#00CC00] transition-colors">
                                  {project.title}
                                </h3>
                                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${statusBadge.bg} ${statusBadge.text}`}>
                                  {statusBadge.label}
                                </span>
                              </div>

                              {/* Category */}
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-xl">{project.category.icon}</span>
                                <span className="text-sm text-gray-600">{project.category.name}</span>
                              </div>

                              {/* Tasks Progress */}
                              {project.myTasksCount > 0 && (
                                <div className="mb-3">
                                  <div className="flex items-center justify-between text-sm mb-1">
                                    <span className="text-gray-600">Мои задачи</span>
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
                                  <span>{new Date(project.startDate).toLocaleDateString('ru-RU')}</span>
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
                      <p className="mt-4 text-gray-600">Загрузка заявок...</p>
                    </div>
                  ) : applications.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">У вас пока нет заявок</h3>
                      <p className="text-gray-600 mb-6">Подайте заявку на участие в проекте</p>
                      <Link 
                        href="/volunteer/projects"
                        className="inline-block px-6 py-3 bg-[#00CC00] text-white rounded-xl font-semibold hover:bg-[#00b300] transition-colors shadow-lg"
                      >
                        Найти проект
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {applications.map((application) => {
                        const appStatusBadge = getApplicationStatusBadge(application.status);
                        const projectStatusBadge = getStatusBadge(application.project.status);

                        return (
                          <div
                            key={application.id}
                            className="border border-gray-200 rounded-xl p-5 hover:border-[#00CC00] hover:shadow-lg transition-all"
                          >
                            <div className="flex items-start gap-4">
                              {/* Project Image */}
                              {application.project.imageUrl ? (
                                <img 
                                  src={application.project.imageUrl} 
                                  alt={application.project.title}
                                  className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}

                              {/* Application Info */}
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <Link 
                                      href={`/volunteer/projects/${application.project.id}`}
                                      className="text-lg font-bold text-gray-900 hover:text-[#00CC00] transition-colors"
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

                                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
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
                                    Подана: {new Date(application.appliedAt).toLocaleDateString('ru-RU')}
                                  </div>
                                </div>

                                {/* Rejection Reason */}
                                {application.status === 'rejected' && application.rejectionReason && (
                                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                                    <p className="text-xs font-semibold text-red-900 mb-1">Причина отклонения:</p>
                                    <p className="text-sm text-red-700">{application.rejectionReason}</p>
                                  </div>
                                )}

                                {/* Action Button */}
                                <Link
                                  href={`/volunteer/projects/${application.project.id}`}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                  Посмотреть проект
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

        {/* Project Details Modal */}
        {showProjectDetails && selectedProject && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">{selectedProject.title}</h2>
                  <p className="text-xs text-gray-600 mt-1">
                    {selectedProject.organizer.organizerProfile?.organizationName || 
                     `${selectedProject.organizer.firstName} ${selectedProject.organizer.lastName}`}
                  </p>
                </div>
                <button
                  onClick={closeProjectDetails}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Project Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Локация</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedProject.location}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Даты проекта</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {new Date(selectedProject.startDate).toLocaleDateString('ru-RU')} - {new Date(selectedProject.endDate).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-xl">{selectedProject.category.icon}</span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Категория</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedProject.category.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Волонтёры</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedProject.currentVolunteers}/{selectedProject.maxVolunteers}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress */}
                {selectedProject.myTasksCount > 0 && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-bold text-gray-900">Ваш прогресс</h3>
                      <span className="text-xl font-bold text-[#00CC00]">
                        {selectedProject.completedTasksCount}/{selectedProject.myTasksCount}
                      </span>
                    </div>
                    <div className="w-full bg-white rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-[#00CC00] to-emerald-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${selectedProject.myTasksCount > 0 ? (selectedProject.completedTasksCount / selectedProject.myTasksCount) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-600 mt-1.5">
                      {selectedProject.completedTasksCount === selectedProject.myTasksCount 
                        ? '🎉 Все задачи выполнены!' 
                        : `Осталось выполнить: ${selectedProject.myTasksCount - selectedProject.completedTasksCount}`}
                    </p>
                  </div>
                )}

                {/* My Tasks */}
                <div>
                  <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Мои задачи ({selectedProject.myTasks.length})
                  </h3>

                  {selectedProject.myTasks.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-xl">
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-900 font-medium">Вам пока не назначены задачи</p>
                      <p className="text-xs text-gray-500 mt-1">Организатор назначит вам задачи в ближайшее время</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedProject.myTasks.map((task) => {
                        const taskStatusBadge = getTaskAssignmentStatusBadge(task.assignmentStatus);
                        const isOverdue = new Date(task.deadline) < new Date() && !['completed', 'confirmed'].includes(task.assignmentStatus);

                        return (
                          <div 
                            key={task.id} 
                            className={`border-2 rounded-xl p-4 transition-all ${
                              task.assignmentStatus === 'confirmed' 
                                ? 'bg-green-50 border-green-200' 
                                : task.assignmentStatus === 'completed'
                                ? 'bg-purple-50 border-purple-200'
                                : isOverdue
                                ? 'bg-red-50 border-red-200'
                                : 'bg-white border-gray-200 hover:border-[#00CC00]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex-1">
                                <h4 className="text-sm font-bold text-gray-900 mb-1">{task.title}</h4>
                                <p className="text-xs text-gray-600 line-clamp-2">{task.description}</p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${taskStatusBadge.bg} ${taskStatusBadge.text}`}>
                                  {taskStatusBadge.icon} {taskStatusBadge.label}
                                </span>
                                {/* Submit Report Button - small, next to status */}
                                {task.assignmentStatus === 'assigned' && task.projectStatus === 'active' && (
                                  <button
                                    onClick={() => openReportModal(task)}
                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Отправить отчёт
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                              {task.skill && (
                                <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-full border border-gray-200">
                                  <svg className="w-3.5 h-3.5 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                  </svg>
                                  <span className="font-medium">{task.skill.name}</span>
                                </div>
                              )}
                              
                              <div className={`flex items-center gap-1 px-2 py-1 rounded-full border ${
                                isOverdue ? 'bg-red-100 border-red-300 text-red-700' : 'bg-white border-gray-200'
                              }`}>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-medium">
                                  {isOverdue ? 'Просрочено: ' : 'До: '}
                                  {new Date(task.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-full border border-gray-200">
                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>Назначена: {new Date(task.assignedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
                              </div>
                            </div>

                            {/* Task Assignment Details */}
                            {task.assignments && task.assignments[0] && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                {task.assignments[0].completedAt && (
                                  <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                                    <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Выполнено: {new Date(task.assignments[0].completedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                )}
                                {task.assignments[0].confirmedAt && (
                                  <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                                    <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Подтверждено: {new Date(task.assignments[0].confirmedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                )}
                                {task.assignments[0].feedback && (
                                  <div className="mt-2 p-2.5 bg-white rounded-lg border border-gray-200">
                                    <p className="text-xs font-semibold text-gray-700 mb-1">Отзыв организатора:</p>
                                    <p className="text-xs text-gray-600">{task.assignments[0].feedback}</p>
                                  </div>
                                )}
                                {task.assignments[0].rating && (
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className="text-xs font-semibold text-gray-700">Оценка:</span>
                                    <div className="flex gap-0.5">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <svg 
                                          key={star}
                                          className={`w-4 h-4 ${star <= task.assignments[0].rating! ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                          fill="none" 
                                          stroke="currentColor" 
                                          viewBox="0 0 24 24"
                                        >
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                        </svg>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <Link
                    href={`/volunteer/projects/${selectedProject.id}`}
                    className="flex-1 px-5 py-2.5 bg-[#00CC00] text-white rounded-xl text-sm font-semibold hover:bg-[#00b300] transition-colors text-center"
                  >
                    Открыть проект
                  </Link>
                  <button
                    onClick={closeProjectDetails}
                    className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Report Modal */}
        {showReportModal && selectedTask && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">Отправить отчёт</h2>
                  <p className="text-sm text-gray-600 mt-1">{selectedTask.title}</p>
                </div>
                <button
                  onClick={closeReportModal}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {reportSuccess ? (
                  <div className="text-center py-8">
                    <div className="text-green-500 text-6xl mb-4">✓</div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      Отчёт отправлен!
                    </h3>
                    <p className="text-gray-600">
                      Ваш отчёт отправлен организатору на проверку. Вы получите уведомление после проверки.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitReport} className="space-y-6">
                    {/* Warning if project is not active */}
                    {selectedTask.projectStatus !== 'active' && (
                      <div className="bg-orange-50 border-l-4 border-orange-400 p-4">
                        <div className="flex items-start gap-3">
                          <svg className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-orange-900">Проект не активен</p>
                            <p className="text-sm text-orange-700 mt-1">
                              Отчёт можно отправлять только для активных проектов. Текущий статус проекта: <strong>{selectedTask.projectStatus}</strong>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Error Message */}
                    {reportError && (
                      <div className="bg-red-50 border-l-4 border-red-400 p-4">
                        <p className="text-sm text-red-700">{reportError}</p>
                      </div>
                    )}

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Описание выполненной работы <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={reportDescription}
                        onChange={(e) => setReportDescription(e.target.value)}
                        rows={5}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                        placeholder="Опишите, что вы сделали..."
                        required
                      />
                    </div>

                    {/* Photo Upload */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Фотографии <span className="text-red-500">*</span>
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handlePhotoUpload}
                          className="hidden"
                          id="photo-upload-modal"
                          disabled={uploadingPhoto}
                        />
                        <label
                          htmlFor="photo-upload-modal"
                          className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          {uploadingPhoto ? 'Загрузка...' : 'Загрузить фотографии'}
                        </label>
                        <p className="text-xs text-gray-500 mt-2">
                          Максимальный размер файла: 5MB
                        </p>
                      </div>

                      {/* Photo Preview */}
                      {reportPhotos.length > 0 && (
                        <div className="grid grid-cols-3 gap-4 mt-4">
                          {reportPhotos.map((photo, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={photo}
                                alt={`Фото ${index + 1}`}
                                className="w-full h-32 object-cover rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={() => removePhoto(index)}
                                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-4 pt-4 border-t border-gray-200">
                      <button
                        type="submit"
                        disabled={submittingReport || selectedTask.projectStatus !== 'active'}
                        className="flex-1 bg-[#00CC00] text-white px-6 py-3 rounded-lg hover:bg-[#00b300] transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submittingReport ? 'Отправка...' : 'Отправить отчёт'}
                      </button>
                      <button
                        type="button"
                        onClick={closeReportModal}
                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                      >
                        Отмена
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarProvider>
  );
}
