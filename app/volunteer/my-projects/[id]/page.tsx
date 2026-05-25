'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import VolunteerNav from '../../components/VolunteerNav';
import VolunteerSidebar from '../../components/VolunteerSidebar';
import AiSupportButton from '@/app/components/AiSupportButton';
import DynamicContent from '@/app/components/DynamicContent';
import { SidebarProvider } from '@/app/contexts/SidebarContext';
import { useToast } from '@/app/components/ToastContainer';
import { useTranslation } from '@/app/i18n/useTranslation';
import { SvgIcon } from '@/app/components/SvgIcon';

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
  projectStatus?: string;
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

export default function MyProjectDetail() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;
  const toast = useToast();
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

  const getTaskAssignmentStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; key: string; icon: string }> = {
      assigned:  { bg: 'bg-blue-100',   text: 'text-blue-700',   key: 'taskStatusAssigned',  icon: '📋' },
      completed: { bg: 'bg-purple-100', text: 'text-purple-700', key: 'taskStatusCompleted', icon: '✓' },
      confirmed: { bg: 'bg-green-100',  text: 'text-green-700',  key: 'taskStatusConfirmed', icon: '✓✓' },
      rejected:  { bg: 'bg-red-100',    text: 'text-red-700',    key: 'taskStatusRejected',  icon: '✗' },
      cancelled: { bg: 'bg-gray-100',   text: 'text-gray-700',   key: 'taskStatusCancelled', icon: '⊘' },
    };
    const entry = map[status];
    return entry
      ? { bg: entry.bg, text: entry.text, label: (t.myProjects as any)?.[entry.key] || status, icon: entry.icon }
      : { bg: 'bg-gray-100', text: 'text-gray-700', label: t.myProjects?.statusUnknown || 'Неизвестно', icon: '?' };
  };

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [notFound, setNotFound] = useState(false);

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
        if (!response.ok) { router.push('/login'); return; }
        const data = await response.json();
        if (data.user.role !== 'volunteer') { router.push('/dashboard'); return; }
        setUser(data.user);
      } catch {
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (user && projectId) {
      fetchProject();
    }
  }, [user, projectId, locale]);

  useEffect(() => {
    if (showReportModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [showReportModal]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      // Загружаем оба типа и ищем проект по ID
      const [activeRes, completedRes] = await Promise.all([
        fetch(`/api/volunteer/my-projects?type=active&locale=${locale}`, { credentials: 'include' }),
        fetch(`/api/volunteer/my-projects?type=completed&locale=${locale}`, { credentials: 'include' }),
      ]);

      let found: Project | null = null;

      if (activeRes.ok) {
        const data = await activeRes.json();
        found = (data.projects || []).find((p: Project) => p.id === projectId) || null;
      }
      if (!found && completedRes.ok) {
        const data = await completedRes.json();
        found = (data.projects || []).find((p: Project) => p.id === projectId) || null;
      }

      if (found) {
        setProject(found);
      } else {
        setNotFound(true);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

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
      if (files.length > 10) {
        setReportError('Можно загрузить максимум 10 фотографий');
        return;
      }

      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) {
          setReportError('Размер каждого файла не должен превышать 5MB');
          return;
        }
        if (!file.type.startsWith('image/')) {
          setReportError('Можно загружать только изображения');
          return;
        }
      }

      const formData = new FormData();
      Array.from(files).forEach((file) => { formData.append('photos', file); });

      const response = await fetch('/api/upload/report-photos', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при загрузке фотографий');
      }

      const data = await response.json();
      setReportPhotos(prev => [...prev, ...data.urls]);
      toast.success(`Загружено ${data.urls.length} фотографий`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка при загрузке фотографий';
      setReportError(msg);
      toast.error(msg);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = (index: number) => {
    setReportPhotos(prev => prev.filter((_, i) => i !== index));
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
        body: JSON.stringify({ description: reportDescription, photos: reportPhotos }),
      });

      const data = await response.json();
      if (!response.ok) {
        setReportError(data.error || 'Ошибка при отправке отчёта');
        return;
      }

      setReportSuccess(true);
      // Сразу убираем кнопку через локальное обновление состояния
      setProject(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          myTasks: prev.myTasks.map(t =>
            t.id === selectedTask.id
              ? {
                  ...t,
                  assignmentStatus: 'completed',
                  assignments: t.assignments.map((a, i) =>
                    i === 0 ? { ...a, status: 'completed', completedAt: new Date().toISOString() } : a
                  ),
                }
              : t
          ),
        };
      });
      setTimeout(() => {
        closeReportModal();
        fetchProject();
      }, 2000);
    } catch {
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
          <p className="mt-4 text-gray-600">{t.common?.loading || 'Загрузка...'}</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (notFound || !project) {
    return (
      <SidebarProvider>
        <div className="min-h-screen bg-green-50">
          <VolunteerSidebar user={user} />
          <VolunteerNav user={user} />
          <DynamicContent>
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Проект не найден</h3>
              <p className="text-gray-600 mb-6">Проект не существует или у вас нет доступа к нему</p>
              <Link
                href="/volunteer/my-projects"
                className="px-6 py-3 bg-[#00CC00] text-white rounded-xl font-semibold hover:bg-[#00b300] transition-colors"
              >
                Вернуться к проектам
              </Link>
            </div>
          </DynamicContent>
          <AiSupportButton />
        </div>
      </SidebarProvider>
    );
  }

  const statusBadge = getStatusBadge(project.status);
  const progressPct = project.myTasksCount > 0
    ? (project.completedTasksCount / project.myTasksCount) * 100
    : 0;

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50">
        <VolunteerSidebar user={user} />
        <VolunteerNav user={user} />

        <DynamicContent>
          {/* Breadcrumb + Back */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">{t.myProjects?.title || 'Мои проекты'}</span>
            </button>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-sm text-gray-400 truncate max-w-xs">{project.title}</span>
          </div>

          {/* Header card — изображение слева, данные справа */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 mb-6 overflow-hidden">
            <div className="flex flex-col sm:flex-row">
              {/* Изображение */}
              <div className="sm:w-56 sm:flex-shrink-0">
                {project.imageUrl ? (
                  <img
                    src={project.imageUrl}
                    alt={project.title}
                    className="w-full h-44 sm:h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-44 sm:h-full bg-gradient-to-br from-[#00CC00] to-emerald-500 flex items-center justify-center">
                    <svg className="w-14 h-14 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Правая часть */}
              <div className="flex-1 p-5 flex flex-col justify-between">
                {/* Заголовок + статус */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h1 className="text-xl font-bold text-gray-900 mb-0.5">{project.title}</h1>
                    <p className="text-sm text-gray-500">
                      {project.organizer.organizerProfile?.organizationName ||
                        `${project.organizer.firstName} ${project.organizer.lastName}`}
                    </p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap flex-shrink-0 ${statusBadge.bg} ${statusBadge.text}`}>
                    {statusBadge.label}
                  </span>
                </div>

                {/* Инфо-плитки */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-100 col-span-2">
                    <div className="w-7 h-7 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">{t.myProjects?.location || 'Локация'}</p>
                      <p className="text-xs font-semibold text-gray-800 leading-snug">{project.location}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-400">{t.myProjects?.projectDates || 'Даты проекта'}</p>
                      <p className="text-xs font-semibold text-gray-800">
                        {formatDate(project.startDate, { day: '2-digit', month: '2-digit', year: 'numeric' })} — {formatDate(project.endDate, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 text-[#00CC00] overflow-hidden">
                      <SvgIcon iconKey={project.category.icon} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-400">{t.myProjects?.category || 'Категория'}</p>
                      <p className="text-xs font-semibold text-gray-800 truncate">{project.category.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-3.5 h-3.5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-400">{t.myProjects?.volunteers || 'Волонтёры'}</p>
                      <p className="text-xs font-semibold text-gray-800">
                        {project.currentVolunteers}/{project.maxVolunteers}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Progress */}
          {project.myTasksCount > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-gray-900">{t.myProjects?.yourProgress || 'Ваш прогресс'}</h3>
                <span className="text-xl font-bold text-[#00CC00]">
                  {project.completedTasksCount}/{project.myTasksCount}
                </span>
              </div>
              <div className="w-full bg-white rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#00CC00] to-emerald-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-2">
                {project.completedTasksCount === project.myTasksCount
                  ? (t.myProjects?.allTasksDone || '🎉 Все задачи выполнены!')
                  : `${t.myProjects?.tasksLeft || 'Осталось выполнить:'} ${project.myTasksCount - project.completedTasksCount}`}
              </p>
            </div>
          )}

          {/* My Tasks */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 mb-6 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {t.myProjects?.myTasks || 'Мои задачи'} ({project.myTasks.length})
            </h2>

            {project.myTasks.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-xl">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-sm text-gray-900 font-medium">{t.myProjects?.noTasksAssigned || 'Вам пока не назначены задачи'}</p>
                <p className="text-xs text-gray-500 mt-1">{t.myProjects?.noTasksHint || 'Организатор назначит вам задачи в ближайшее время'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {project.myTasks.map((task) => {
                  const taskStatusBadge = getTaskAssignmentStatusBadge(task.assignmentStatus);
                  const isOverdue = new Date(task.deadline) < new Date() && !['completed', 'confirmed'].includes(task.assignmentStatus);

                  return (
                    <div
                      key={task.id}
                      className={`border-2 rounded-xl p-5 transition-all ${
                        task.assignmentStatus === 'confirmed'
                          ? 'bg-green-50 border-green-200'
                          : task.assignmentStatus === 'completed'
                          ? 'bg-purple-50 border-purple-200'
                          : isOverdue
                          ? 'bg-red-50 border-red-200'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-gray-900 mb-1">{task.title}</h4>
                          <p className="text-xs text-gray-600">{task.description}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`text-xs font-semibold ${taskStatusBadge.text}`}>
                            {taskStatusBadge.icon} {taskStatusBadge.label}
                          </span>
                          {task.assignmentStatus === 'assigned' && task.projectStatus === 'active' && !task.assignments[0]?.completedAt && (
                            <button
                              onClick={() => openReportModal(task)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00CC00] text-white text-xs font-semibold rounded-lg hover:bg-[#00b300] transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              {t.myProjects?.sendReport || 'Отправить отчёт'}
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
                            {isOverdue ? (t.myProjects?.overdue || 'Просрочено:') : (t.myProjects?.until || 'До:')}
                            {' '}{formatDate(task.deadline, { day: 'numeric', month: 'short' })}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-full border border-gray-200">
                          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{t.myProjects?.assignedAt || 'Назначена:'} {formatDate(task.assignedAt, { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </div>

                      {task.assignments && task.assignments[0] && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          {task.assignments[0].completedAt && (
                            <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                              <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{t.myProjects?.completedAt || 'Выполнено:'} {formatDate(task.assignments[0].completedAt, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          )}
                          {task.assignments[0].confirmedAt && (
                            <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                              <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{t.myProjects?.confirmedAt || 'Подтверждено:'} {formatDate(task.assignments[0].confirmedAt, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          )}
                          {task.assignments[0].feedback && (
                            <div className="mt-2 p-2.5 bg-white rounded-lg border border-gray-200">
                              <p className="text-xs font-semibold text-gray-700 mb-1">{t.myProjects?.organizerFeedback || 'Отзыв организатора:'}</p>
                              <p className="text-xs text-gray-600">{task.assignments[0].feedback}</p>
                            </div>
                          )}
                          {task.assignments[0].rating && (
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs font-semibold text-gray-700">{t.myProjects?.rating || 'Оценка:'}</span>
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

          {/* Bottom action */}
          <div className="flex gap-3">
            <Link
              href={`/volunteer/projects/${project.id}`}
              className="flex-1 px-5 py-3 bg-[#00CC00] text-white rounded-xl text-sm font-semibold hover:bg-[#00b300] transition-colors text-center"
            >
              {t.myProjects?.openProject || 'Открыть проект'}
            </Link>
            <button
              onClick={() => router.back()}
              className="px-5 py-3 bg-white text-gray-700 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              {t.myProjects?.close || t.common?.close || 'Назад'}
            </button>
          </div>
        </DynamicContent>

        <AiSupportButton />

        {/* Report Modal */}
        {showReportModal && selectedTask && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">{t.myProjects?.reportTitle || 'Отправить отчёт'}</h2>
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

              <div className="p-6">
                {reportSuccess ? (
                  <div className="text-center py-8">
                    <div className="text-green-500 text-6xl mb-4">✓</div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {t.myProjects?.reportSent || 'Отчёт отправлен!'}
                    </h3>
                    <p className="text-gray-600">
                      {t.myProjects?.reportSentHint || 'Ваш отчёт отправлен организатору на проверку. Вы получите уведомление после проверки.'}
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitReport} className="space-y-6">
                    {selectedTask.projectStatus !== 'active' && (
                      <div className="bg-orange-50 border-l-4 border-orange-400 p-4">
                        <div className="flex items-start gap-3">
                          <svg className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-orange-900">{t.myProjects?.projectNotActive || 'Проект не активен'}</p>
                            <p className="text-sm text-orange-700 mt-1">
                              {t.myProjects?.projectNotActiveHint || 'Отчёт можно отправлять только для активных проектов. Текущий статус проекта:'} <strong>{selectedTask.projectStatus}</strong>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {reportError && (
                      <div className="bg-red-50 border-l-4 border-red-400 p-4">
                        <p className="text-sm text-red-700">{reportError}</p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t.myProjects?.reportDescription || 'Описание выполненной работы'} <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={reportDescription}
                        onChange={(e) => setReportDescription(e.target.value)}
                        rows={5}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                        placeholder={t.myProjects?.reportDescriptionPlaceholder || 'Опишите, что вы сделали...'}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t.myProjects?.reportPhotos || 'Фотографии'} <span className="text-red-500">*</span>
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handlePhotoUpload}
                          className="hidden"
                          id="photo-upload-page"
                          disabled={uploadingPhoto}
                        />
                        <label
                          htmlFor="photo-upload-page"
                          className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          {uploadingPhoto ? (t.myProjects?.uploading || 'Загрузка...') : (t.myProjects?.uploadPhotos || 'Загрузить фотографии')}
                        </label>
                        <p className="text-xs text-gray-500 mt-2">
                          {t.myProjects?.maxFileSize || 'Максимальный размер файла: 5MB'}
                        </p>
                      </div>

                      {reportPhotos.length > 0 && (
                        <div className="grid grid-cols-3 gap-4 mt-4">
                          {reportPhotos.map((photo, index) => (
                            <div key={index} className="relative group">
                              <img src={photo} alt={`Фото ${index + 1}`} className="w-full h-32 object-cover rounded-lg" />
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

                    <div className="flex gap-4 pt-4 border-t border-gray-200">
                      <button
                        type="submit"
                        disabled={submittingReport || selectedTask.projectStatus !== 'active'}
                        className="flex-1 bg-[#00CC00] text-white px-6 py-3 rounded-lg hover:bg-[#00b300] transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submittingReport ? (t.myProjects?.submitting || 'Отправка...') : (t.myProjects?.sendReport || 'Отправить отчёт')}
                      </button>
                      <button
                        type="button"
                        onClick={closeReportModal}
                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                      >
                        {t.common?.cancel || 'Отмена'}
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
