'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import OrganizerNav from '../../components/OrganizerNav';
import dynamic from 'next/dynamic';
import { useToast } from '@/app/components/ToastContainer';
import { useTranslation } from '@/app/i18n/useTranslation';
import { SvgIcon } from '@/app/components/SvgIcon';
import { Tooltip } from '@/app/components/Tooltip';

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
    name: string;
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
  const { t } = useTranslation('organizer');

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
  const [activeTab, setActiveTab] = useState<'tasks' | 'applications' | 'participants'>('tasks');
  const [showMapModal, setShowMapModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Состояния для участников
  const [participants, setParticipants] = useState<any[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [expandedParticipant, setExpandedParticipant] = useState<string | null>(null);
  const [assignedTasks, setAssignedTasks] = useState<Record<string, any[]>>({});
  
  // Состояния для управления статусами
  const [changingStatus, setChangingStatus] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingApplicationId, setRejectingApplicationId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  
  // Состояния для просмотра отчётов
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [processingReport, setProcessingReport] = useState(false);
  const [reportFeedback, setReportFeedback] = useState('');
  const [reportRating, setReportRating] = useState<number>(0);

  // Блокировка скролла при открытии модального окна карты или назначения
  useEffect(() => {
    if (showMapModal || showAssignModal || showRejectModal || showApplicationModal || showReportModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showMapModal, showAssignModal, showRejectModal, showApplicationModal, showReportModal]);

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
      
      // Проверяем, набрано ли нужное количество волонтеров (только при первой загрузке)
      if (!project && data.project.status === 'recruiting' && 
          data.project.currentVolunteers >= data.project.maxVolunteers) {
        toast.success(
          `🎉 Набрано нужное количество волонтеров (${data.project.currentVolunteers}/${data.project.maxVolunteers})! Вы можете завершить набор и перейти к следующему этапу.`
        );
      }
      
      // Загружаем задачи всегда
      await fetchTasks();
      
      // Загружаем заявки только для проектов в статусе набора волонтеров
      if (data.project.status === 'recruiting') {
        await fetchApplications();
      } else {
        setApplications([]);
      }
      
      // Загружаем участников для проектов со статусом recruiting и выше
      if (['recruiting', 'upcoming', 'active', 'completed', 'cancelled'].includes(data.project.status)) {
        await fetchParticipants();
      }
      
      return data.project;
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

  const fetchParticipants = async () => {
    try {
      setLoadingParticipants(true);
      const response = await fetch(`/api/organizer/projects/${projectId}/participants`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setParticipants(data || []);
      } else {
        console.error('Ошибка загрузки участников:', response.status);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const fetchParticipantTasks = async (volunteerId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        const allTasks = data.tasks || [];
        
        // Получаем назначения для этого волонтера
        const volunteerTasks = allTasks.filter((task: any) => 
          task.assignments?.some((a: any) => 
            a.volunteerId === volunteerId && 
            ['assigned', 'completed', 'confirmed'].includes(a.status)
          )
        ).map((task: any) => {
          const assignment = task.assignments.find((a: any) => a.volunteerId === volunteerId);
          return {
            ...task,
            assignmentStatus: assignment?.status,
            assignedAt: assignment?.createdAt,
            assignments: task.assignments, // Передаём все assignments включая report
          };
        });
        
        setAssignedTasks(prev => ({
          ...prev,
          [volunteerId]: volunteerTasks
        }));
      }
    } catch (error) {
      console.error('Error fetching participant tasks:', error);
    }
  };

  const handleAssignTask = async (volunteerId: string) => {
    if (!selectedTask) return;

    try {
      const response = await fetch(
        `/api/organizer/projects/${projectId}/tasks/${selectedTask.id}/assign`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ volunteerId }),
        }
      );

      if (response.ok) {
        toast.success('Задача успешно назначена');
        setShowAssignModal(false);
        setSelectedTask(null);
        await fetchParticipants();
        await fetchTasks();
        // Обновляем задачи участника если он развернут
        if (expandedParticipant === volunteerId) {
          await fetchParticipantTasks(volunteerId);
        }
      } else {
        const data = await response.json();
        toast.error(data.error || 'Ошибка при назначении задачи');
      }
    } catch (error) {
      console.error('Error assigning task:', error);
      toast.error('Произошла ошибка при назначении задачи');
    }
  };

  const handleUnassignTask = async (taskId: string, volunteerId: string) => {
    toast.confirm(
      'Вы уверены, что хотите отменить назначение этой задачи?',
      async () => {
        try {
          const response = await fetch(
            `/api/organizer/projects/${projectId}/tasks/${taskId}/assignments/${volunteerId}`,
            {
              method: 'DELETE',
              credentials: 'include',
            }
          );

          if (response.ok) {
            toast.success('Назначение отменено');
            await fetchParticipants();
            await fetchTasks();
            await fetchParticipantTasks(volunteerId);
          } else {
            const data = await response.json();
            toast.error(data.error || 'Ошибка при отмене назначения');
          }
        } catch (error) {
          console.error('Error unassigning task:', error);
          toast.error('Произошла ошибка при отмене назначения');
        }
      },
      'warning'
    );
  };

  const toggleParticipantExpand = async (volunteerId: string) => {
    if (expandedParticipant === volunteerId) {
      setExpandedParticipant(null);
    } else {
      setExpandedParticipant(volunteerId);
      if (!assignedTasks[volunteerId]) {
        await fetchParticipantTasks(volunteerId);
      }
    }
  };

  const handleApplicationAction = async (applicationId: string, action: 'approve' | 'reject') => {
    // Если отклоняем, показываем модальное окно для ввода причины
    if (action === 'reject') {
      setRejectingApplicationId(applicationId);
      setRejectionReason('');
      setShowRejectModal(true);
      setShowApplicationModal(false); // Закрываем модальное окно заявки
      return;
    }

    // Одобрение заявки
    try {
      const response = await fetch(`/api/organizer/applications/${applicationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: 'approved' }),
      });

      if (response.ok) {
        await fetchApplications();
        const updatedProjectData = await fetchProject();
        
        toast.success('Заявка одобрена');
        setShowApplicationModal(false); // Закрываем модальное окно
        
        // Проверяем, достигнуто ли нужное количество волонтеров после одобрения
        if (project && project.status === 'recruiting') {
          const newCurrentVolunteers = project.currentVolunteers + 1;
          if (newCurrentVolunteers >= project.maxVolunteers) {
            setTimeout(() => {
              toast.success(
                `🎉 Набрано нужное количество волонтеров (${newCurrentVolunteers}/${project.maxVolunteers})! Вы можете завершить набор и перейти к следующему этапу.`
              );
            }, 1000);
          }
        }
      } else {
        const data = await response.json();
        toast.error(data.error || 'Ошибка при обработке заявки');
      }
    } catch (error) {
      console.error('Error handling application:', error);
      toast.error('Произошла ошибка при обработке заявки');
    }
  };

  const handleViewApplication = (application: Application) => {
    setSelectedApplication(application);
    setShowApplicationModal(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectingApplicationId) return;

    if (!rejectionReason.trim()) {
      toast.error('Пожалуйста, укажите причину отклонения');
      return;
    }

    try {
      const response = await fetch(`/api/organizer/applications/${rejectingApplicationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          status: 'rejected',
          rejectionReason: rejectionReason.trim()
        }),
      });

      if (response.ok) {
        await fetchApplications();
        toast.success('Заявка отклонена. Волонтер получит уведомление на email.');
        
        // Закрываем модальное окно причины отклонения
        setShowRejectModal(false);
        setRejectionReason('');
        
        // Обновляем данные выбранной заявки, чтобы показать новый статус
        if (selectedApplication && selectedApplication.id === rejectingApplicationId) {
          const updatedApplication = applications.find(app => app.id === rejectingApplicationId);
          if (updatedApplication) {
            setSelectedApplication(updatedApplication);
          }
        }
        
        setRejectingApplicationId(null);
        
        // Модальное окно заявки остается открытым (showApplicationModal не меняем)
      } else {
        const data = await response.json();
        toast.error(data.error || 'Ошибка при отклонении заявки');
      }
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast.error('Произошла ошибка при отклонении заявки');
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

  // Функция для просмотра отчёта
  const handleViewReport = async (taskId: string, assignmentId: string) => {
    try {
      setLoadingReport(true);
      setShowReportModal(true);
      setReportFeedback('');
      setReportRating(0);
      
      const response = await fetch(
        `/api/organizer/projects/${projectId}/tasks/${taskId}/reports`,
        {
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error('Ошибка при загрузке отчёта');
      }

      const data = await response.json();
      const assignment = data.assignments.find((a: any) => a.id === assignmentId);
      
      if (!assignment || !assignment.report) {
        throw new Error('Отчёт не найден');
      }

      setSelectedReport({
        ...assignment.report,
        assignment: {
          id: assignment.id,
          taskId: assignment.taskId,
          volunteer: assignment.volunteer,
          status: assignment.status,
        }
      });
    } catch (error) {
      console.error('Error loading report:', error);
      toast.error('Ошибка при загрузке отчёта');
      setShowReportModal(false);
    } finally {
      setLoadingReport(false);
    }
  };

  // Функция для подтверждения отчёта
  const handleConfirmReport = async () => {
    if (!selectedReport) return;

    try {
      setProcessingReport(true);
      const response = await fetch(
        `/api/organizer/projects/${projectId}/tasks/${selectedReport.assignment.taskId}/reports/${selectedReport.assignment.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            action: 'confirm',
            feedback: reportFeedback.trim() || undefined,
            rating: reportRating > 0 ? reportRating : undefined,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка при подтверждении отчёта');
      }

      toast.success('Отчёт подтверждён! Задача отмечена как выполненная.');
      setShowReportModal(false);
      setSelectedReport(null);
      
      // Обновляем данные
      await fetchParticipants();
      await fetchTasks();
      if (expandedParticipant) {
        await fetchParticipantTasks(expandedParticipant);
      }
    } catch (error) {
      console.error('Error confirming report:', error);
      toast.error(error instanceof Error ? error.message : 'Ошибка при подтверждении отчёта');
    } finally {
      setProcessingReport(false);
    }
  };

  // Функция для отклонения отчёта
  const handleRejectReport = async () => {
    if (!selectedReport) return;

    if (!reportFeedback.trim()) {
      toast.error('Пожалуйста, укажите причину отклонения');
      return;
    }

    try {
      setProcessingReport(true);
      const response = await fetch(
        `/api/organizer/projects/${projectId}/tasks/${selectedReport.assignment.taskId}/reports/${selectedReport.assignment.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            action: 'reject',
            feedback: reportFeedback.trim(),
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка при отклонении отчёта');
      }

      toast.success('Отчёт отклонён. Волонтёр может отправить новый отчёт.');
      setShowReportModal(false);
      setSelectedReport(null);
      
      // Обновляем данные
      await fetchParticipants();
      await fetchTasks();
      if (expandedParticipant) {
        await fetchParticipantTasks(expandedParticipant);
      }
    } catch (error) {
      console.error('Error rejecting report:', error);
      toast.error(error instanceof Error ? error.message : 'Ошибка при отклонении отчёта');
    } finally {
      setProcessingReport(false);
    }
  };

  const handleChangeStatus = async (newStatus: string) => {
    if (!project) return;

    // Определяем текст подтверждения в зависимости от статуса
    let confirmMessage = '';
    let statusText = '';
    
    switch (newStatus) {
      case 'upcoming':
        confirmMessage = 'Вы уверены, что хотите завершить набор волонтеров и перевести проект в статус "Скоро начнется"?';
        statusText = 'Скоро начнется';
        break;
      case 'active':
        confirmMessage = 'Вы уверены, что хотите активировать проект? После этого он будет в процессе выполнения.';
        statusText = 'Активный';
        break;
      case 'completed':
        confirmMessage = 'Вы уверены, что хотите завершить проект? Убедитесь, что все задачи выполнены.';
        statusText = 'Завершенный';
        break;
      case 'cancelled':
        confirmMessage = 'Вы уверены, что хотите отменить проект? Все назначения задач будут отменены.';
        statusText = 'Отмененный';
        break;
      default:
        return;
    }

    toast.confirm(
      confirmMessage,
      async () => {
        try {
          setChangingStatus(true);
          const response = await fetch(`/api/organizer/projects/${projectId}/status`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ newStatus }),
          });

          const data = await response.json();

          if (response.ok) {
            toast.success(`Статус проекта изменен на "${statusText}"`);
            await fetchProject();
          } else {
            toast.error(data.error || 'Ошибка при изменении статуса');
          }
        } catch (error) {
          console.error('Error changing status:', error);
          toast.error('Произошла ошибка при изменении статуса');
        } finally {
          setChangingStatus(false);
        }
      },
      'warning'
    );
  };

  const getAvailableStatusTransitions = (currentStatus: string): Array<{ status: string; label: string; color: string }> => {
    const transitions: Record<string, Array<{ status: string; label: string; color: string }>> = {
      recruiting: [
        { status: 'upcoming', label: 'Завершить набор', color: 'bg-blue-500 hover:bg-blue-600' },
        { status: 'cancelled', label: 'Отменить проект', color: 'bg-red-500 hover:bg-red-600' },
      ],
      upcoming: [
        { status: 'active', label: 'Активировать проект', color: 'bg-purple-500 hover:bg-purple-600' },
        { status: 'cancelled', label: 'Отменить проект', color: 'bg-red-500 hover:bg-red-600' },
      ],
      active: [
        { status: 'completed', label: 'Завершить проект', color: 'bg-green-500 hover:bg-green-600' },
        { status: 'cancelled', label: 'Отменить проект', color: 'bg-red-500 hover:bg-red-600' },
      ],
    };

    return transitions[currentStatus] || [];
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      moderation: 'bg-orange-100 text-orange-700',
      rejected: 'bg-red-100 text-red-700',
      recruiting: 'bg-green-100 text-green-700',
      upcoming: 'bg-blue-100 text-blue-700',
      active: 'bg-purple-100 text-purple-700',
      completed: 'bg-gray-100 text-gray-700',
      cancelled: 'bg-red-100 text-red-700',
      blocked: 'bg-red-100 text-red-700',
    };
    return badges[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      draft: 'Черновик',
      moderation: 'На проверке',
      rejected: 'Отклонен',
      recruiting: 'Набор волонтеров',
      upcoming: 'Скоро начнется',
      active: 'Активный',
      completed: 'Завершён',
      cancelled: 'Отменен',
      blocked: 'Заблокирован',
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
            <span className="font-medium">{t.projectDetail?.backToProjects || 'Назад к проектам'}</span>
          </Link>
          
          <nav className="flex items-center gap-2 text-sm mt-3 ml-1">
            <Link
              href="/organizer/projects"
              className="text-gray-500 hover:text-[#00CC00] transition-colors"
            >
              {t.projectDetail?.myProjects || 'Мои проекты'}
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
                      <Tooltip text="Редактировать проект">
                        <Link
                          href={`/organizer/projects?edit=${project.id}`}
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Link>
                      </Tooltip>
                    )}

                    {/* Кнопка удаления для черновиков и проектов на модерации */}
                    {(project.status === 'draft' || project.status === 'moderation') && (
                      <Tooltip text="Удалить проект">
                        <button
                          onClick={handleDeleteProject}
                          disabled={deleting}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                        {deleting ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-500"></div>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                        </button>
                      </Tooltip>
                    )}
                  </div>
                </div>
                
                <div className="mb-4">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusBadge(project.status)}`}>
                    {getStatusText(project.status)}
                  </span>
                </div>

                {/* Кнопки управления статусами */}
                {getAvailableStatusTransitions(project.status).length > 0 && (
                  <div className="mb-4 space-y-2">
                    <h3 className="text-sm font-semibold text-gray-700">{t.projectDetail?.statusManagement || 'Управление статусом'}</h3>
                    <div className="flex flex-col gap-2">
                      {getAvailableStatusTransitions(project.status).map((transition) => (
                        <button
                          key={transition.status}
                          onClick={() => handleChangeStatus(transition.status)}
                          disabled={changingStatus}
                          className={`px-4 py-2 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${transition.color}`}
                        >
                          {changingStatus ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Изменение...</span>
                            </div>
                          ) : (
                            transition.label
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {project.status === 'rejected' && project.rejectionReason && (
                  <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-400 rounded-r-lg">
                    <p className="text-xs font-semibold text-red-900 mb-1">{t.projectDetail?.rejectionReason || 'Причина отклонения'}:</p>
                    <p className="text-xs text-red-700">{project.rejectionReason}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">{t.projectDetail?.description || 'Описание'}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{project.description}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">{t.projectDetail?.category || 'Категория'}</h3>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 flex items-center justify-center bg-green-100 rounded-lg text-[#00CC00] overflow-hidden flex-shrink-0">
                        <SvgIcon iconKey={project.category.icon} className="w-4 h-4" />
                      </div>
                      <span className="text-sm text-gray-600">{project.category.name || project.category.slug}</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">{t.projectDetail?.location || 'Местоположение'}</h3>
                    <p className="text-sm text-gray-600">{project.location}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">{t.projectDetail?.dates || 'Даты'}</h3>
                    <p className="text-sm text-gray-600">
                      {new Date(project.startDate).toLocaleDateString('ru-RU')} - {new Date(project.endDate).toLocaleDateString('ru-RU')}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">{t.projectDetail?.volunteers || 'Волонтёры'}</h3>
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
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">{t.common?.location || 'Карта'}</h3>
                      <button
                        onClick={() => setShowMapModal(true)}
                        className="w-full px-4 py-3 bg-[#00CC00] text-white rounded-lg text-sm font-medium hover:bg-[#00b300] transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        {t.projectDetail?.showOnMap || 'Показать на карте'}
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
                      {t.projectDetail?.tabTasks || 'Задачи'} ({filteredTasks.length})
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('participants')}
                    className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                      activeTab === 'participants'
                        ? 'bg-white text-[#00CC00] border-b-2 border-[#00CC00]'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {t.projectDetail?.tabParticipants || 'Участники'} ({participants.length})
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
                      {t.projectDetail?.tabApplications || 'Заявки'} ({applications.length})
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
                            
                            <div className="flex flex-wrap gap-2 mb-3">
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

                {/* Participants Tab */}
                {activeTab === 'participants' && (
                  <div>
                    {loadingParticipants ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#00CC00] mx-auto"></div>
                        <p className="mt-4 text-gray-600">Загрузка участников...</p>
                      </div>
                    ) : participants.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <p className="text-gray-500 font-medium">Пока нет участников</p>
                        <p className="text-gray-400 text-sm mt-1">Одобрите заявки волонтеров, чтобы они стали участниками проекта</p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                        {participants.map((participant) => (
                          <div key={participant.id} className="border border-gray-200 rounded-lg overflow-hidden hover:border-[#00CC00] hover:shadow-md transition-all">
                            {/* Participant Header */}
                            <div className="p-4">
                              <div className="flex items-start gap-4">
                                {participant.avatarUrl ? (
                                  <img 
                                    src={participant.avatarUrl} 
                                    alt={`${participant.firstName} ${participant.lastName}`}
                                    className="w-14 h-14 rounded-full object-cover border-2 border-gray-200"
                                  />
                                ) : (
                                  <div className="w-14 h-14 bg-gradient-to-br from-green-200 to-green-300 rounded-full flex items-center justify-center border-2 border-gray-200">
                                    <svg className="w-7 h-7 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                  </div>
                                )}
                                <div className="flex-1">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <h4 className="font-semibold text-gray-900 text-lg">
                                        {participant.firstName} {participant.lastName}
                                      </h4>
                                      <p className="text-sm text-gray-600">{participant.email}</p>
                                      <p className="text-xs text-gray-500 mt-1">
                                        <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        {participant.city}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                        {participant.assignedTasksCount} {participant.assignedTasksCount === 1 ? 'задача' : 'задач'}
                                      </span>
                                      <p className="text-xs text-gray-500 mt-2">
                                        Присоединился: {new Date(participant.joinedAt).toLocaleDateString('ru-RU')}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex gap-2 mt-4">
                                <button
                                  onClick={() => toggleParticipantExpand(participant.volunteerId)}
                                  className="flex-1 px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                  </svg>
                                  {expandedParticipant === participant.volunteerId ? 'Скрыть задачи' : 'Показать задачи'}
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedTask(null);
                                    setShowAssignModal(true);
                                    // Сохраняем ID волонтера для назначения
                                    (window as any).selectedVolunteerId = participant.volunteerId;
                                  }}
                                  className="px-4 py-2 bg-[#00CC00] text-white text-sm font-semibold rounded-lg hover:bg-[#00b300] transition-colors flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                  Назначить задачу
                                </button>
                              </div>
                            </div>

                            {/* Expanded Tasks List */}
                            {expandedParticipant === participant.volunteerId && (
                              <div className="border-t border-gray-200 bg-gray-50 p-4">
                                <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                  <svg className="w-5 h-5 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                  </svg>
                                  Назначенные задачи
                                </h5>
                                {!assignedTasks[participant.volunteerId] ? (
                                  <div className="text-center py-4">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#00CC00] mx-auto"></div>
                                  </div>
                                ) : assignedTasks[participant.volunteerId].length === 0 ? (
                                  <p className="text-sm text-gray-500 text-center py-4">Задачи пока не назначены</p>
                                ) : (
                                  <div className="space-y-2">
                                    {assignedTasks[participant.volunteerId].map((task: any) => {
                                      // Находим назначение для этой задачи
                                      const assignment = task.assignments?.find((a: any) => a.volunteerId === participant.volunteerId);
                                      const hasReport = assignment && assignment.report;
                                      
                                      // Отладка - выводим в консоль
                                      console.log('Task:', task.title, 'Status:', task.assignmentStatus, 'Has Report:', hasReport, 'Assignment:', assignment);
                                      
                                      return (
                                        <div key={task.id} className="bg-white border border-gray-200 rounded-lg p-3">
                                          <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                              <h6 className="font-medium text-gray-900">{task.title}</h6>
                                              <p className="text-xs text-gray-600 mt-1">{task.description}</p>
                                            </div>
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ml-2 ${
                                              task.assignmentStatus === 'assigned' ? 'bg-blue-100 text-blue-700' :
                                              task.assignmentStatus === 'completed' ? 'bg-green-100 text-green-700' :
                                              task.assignmentStatus === 'confirmed' ? 'bg-purple-100 text-purple-700' :
                                              'bg-gray-100 text-gray-700'
                                            }`}>
                                              {task.assignmentStatus === 'assigned' && 'Назначена'}
                                              {task.assignmentStatus === 'completed' && 'Выполнена'}
                                              {task.assignmentStatus === 'confirmed' && 'Подтверждена'}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between mt-2 gap-2">
                                            <span className="text-xs text-gray-500">
                                              Назначена: {new Date(task.assignedAt).toLocaleDateString('ru-RU')}
                                            </span>
                                            <div className="flex items-center gap-2">
                                              {/* Кнопка "Посмотреть отчёт" - показываем если есть отчёт */}
                                              {hasReport && task.assignmentStatus === 'assigned' && (
                                                <button
                                                  onClick={() => handleViewReport(task.id, assignment.id)}
                                                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                                >
                                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                  </svg>
                                                  Посмотреть отчёт
                                                </button>
                                              )}
                                              {task.assignmentStatus === 'assigned' && !hasReport && (
                                                <button
                                                  onClick={() => handleUnassignTask(task.id, participant.volunteerId)}
                                                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                                                >
                                                  Отменить
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
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
                    {project.status !== 'recruiting' ? (
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
                          <div 
                            key={application.id} 
                            onClick={() => handleViewApplication(application)}
                            className="border border-gray-200 rounded-lg p-4 hover:border-[#00CC00] hover:shadow-md transition-all cursor-pointer"
                          >
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
                              <div className="pt-3 border-t border-gray-100">
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

      {/* Task Assignment Modal */}
      {showAssignModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowAssignModal(false);
            setSelectedTask(null);
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Назначить задачу</h2>
                <p className="text-sm text-gray-600 mt-1">Выберите задачу для назначения волонтеру</p>
              </div>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedTask(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {tasks.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Нет доступных задач для назначения</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        selectedTask?.id === task.id
                          ? 'border-[#00CC00] bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{task.title}</h4>
                          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                          <div className="flex flex-wrap gap-2">
                            {task.requiredSkill && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                {task.requiredSkill.name}
                              </span>
                            )}
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                              {task.currentVolunteers}/{task.requiredVolunteers} волонтёров
                            </span>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTaskStatusBadge(task.status)}`}>
                              {getTaskStatusText(task.status)}
                            </span>
                          </div>
                        </div>
                        {selectedTask?.id === task.id && (
                          <svg className="w-6 h-6 text-[#00CC00] flex-shrink-0 ml-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedTask(null);
                }}
                className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-300 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  const volunteerId = (window as any).selectedVolunteerId;
                  if (volunteerId) {
                    handleAssignTask(volunteerId);
                  }
                }}
                disabled={!selectedTask}
                className="flex-1 px-4 py-2.5 bg-[#00CC00] text-white text-sm font-semibold rounded-lg hover:bg-[#00b300] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Назначить задачу
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Application Details Modal */}
      {showApplicationModal && selectedApplication && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowApplicationModal(false);
            setSelectedApplication(null);
          }}
        >
          <div 
            className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Детали заявки</h3>
                <button
                  onClick={() => {
                    setShowApplicationModal(false);
                    setSelectedApplication(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Volunteer Info */}
              <div className="mb-6">
                <div className="flex items-start gap-4 mb-4">
                  {selectedApplication.volunteer.avatarUrl ? (
                    <img 
                      src={selectedApplication.volunteer.avatarUrl} 
                      alt={`${selectedApplication.volunteer.firstName} ${selectedApplication.volunteer.lastName}`}
                      className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gradient-to-br from-green-200 to-green-300 rounded-full flex items-center justify-center border-2 border-gray-200">
                      <svg className="w-10 h-10 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="text-xl font-bold text-gray-900 mb-1">
                      {selectedApplication.volunteer.firstName} {selectedApplication.volunteer.lastName}
                    </h4>
                    <p className="text-gray-600 mb-1">
                      <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {selectedApplication.volunteer.email}
                    </p>
                    <p className="text-sm text-gray-500">
                      <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Подана: {new Date(selectedApplication.appliedAt).toLocaleDateString('ru-RU')} в {new Date(selectedApplication.appliedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Skills */}
              {selectedApplication.volunteer.skills.length > 0 && (
                <div className="mb-6">
                  <h5 className="text-sm font-semibold text-gray-700 mb-3">Навыки волонтера</h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedApplication.volunteer.skills.map((skill) => (
                      <span key={skill.id} className="px-3 py-1.5 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                        {skill.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Message */}
              {selectedApplication.message && (
                <div className="mb-6">
                  <h5 className="text-sm font-semibold text-gray-700 mb-3">Сообщение от волонтера</h5>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedApplication.message}</p>
                  </div>
                </div>
              )}

              {/* Task Info */}
              {selectedApplication.task && (
                <div className="mb-6">
                  <h5 className="text-sm font-semibold text-gray-700 mb-3">Интересующая задача</h5>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-900 font-medium">{selectedApplication.task.title}</p>
                  </div>
                </div>
              )}

              {/* Status Info for approved/rejected */}
              {selectedApplication.status !== 'pending' && (
                <div className="mb-6">
                  <h5 className="text-sm font-semibold text-gray-700 mb-3">Статус заявки</h5>
                  <div className={`border rounded-lg p-4 ${
                    selectedApplication.status === 'approved' 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {selectedApplication.status === 'approved' ? (
                        <>
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-semibold text-green-900">Заявка одобрена</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-semibold text-red-900">Заявка отклонена</span>
                        </>
                      )}
                    </div>
                    {selectedApplication.status === 'approved' && (
                      <p className="text-sm text-green-700">
                        Волонтер добавлен в список участников проекта
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons - only for pending */}
              {selectedApplication.status === 'pending' ? (
                <div className="flex gap-3 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => handleApplicationAction(selectedApplication.id, 'approve')}
                    className="flex-1 px-6 py-3 bg-green-500 text-white text-sm font-semibold rounded-xl hover:bg-green-600 transition-colors shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Одобрить
                  </button>
                  <button
                    onClick={() => handleApplicationAction(selectedApplication.id, 'reject')}
                    className="flex-1 px-6 py-3 bg-red-500 text-white text-sm font-semibold rounded-xl hover:bg-red-600 transition-colors shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Отклонить
                  </button>
                </div>
              ) : (
                <div className="pt-6 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowApplicationModal(false);
                      setSelectedApplication(null);
                    }}
                    className="w-full px-6 py-3 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Закрыть
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Application Modal */}
      {showRejectModal && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowRejectModal(false);
            setRejectingApplicationId(null);
            setRejectionReason('');
          }}
        >
          <div 
            className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Отклонить заявку</h3>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectingApplicationId(null);
                  setRejectionReason('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Причина отклонения <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Укажите причину, по которой заявка отклонена. Волонтер получит это сообщение на email."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                rows={5}
                maxLength={500}
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-sm text-gray-500">
                  Волонтер получит уведомление на email
                </p>
                <p className="text-sm text-gray-400">
                  {rejectionReason.length}/500
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectingApplicationId(null);
                  setRejectionReason('');
                }}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={!rejectionReason.trim()}
                className="flex-1 px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Отклонить заявку
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Report View Modal */}
      {showReportModal && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => {
            if (!processingReport) {
              setShowReportModal(false);
              setSelectedReport(null);
              setReportFeedback('');
              setReportRating(0);
            }
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-green-100">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Отчёт о выполнении задачи</h2>
                {selectedReport && (
                  <p className="text-sm text-gray-600 mt-1">
                    Волонтёр: {selectedReport.assignment.volunteer.firstName} {selectedReport.assignment.volunteer.lastName}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  if (!processingReport) {
                    setShowReportModal(false);
                    setSelectedReport(null);
                    setReportFeedback('');
                    setReportRating(0);
                  }
                }}
                disabled={processingReport}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors disabled:opacity-50"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {loadingReport ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00] mx-auto"></div>
                  <p className="mt-4 text-gray-600">Загрузка отчёта...</p>
                </div>
              ) : selectedReport ? (
                <>
                  {/* Report Description */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Описание выполненной работы</h3>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {selectedReport.description || 'Описание не предоставлено'}
                      </p>
                    </div>
                  </div>

                  {/* Report Photos */}
                  {selectedReport.photos && selectedReport.photos.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        Фотографии ({selectedReport.photos.length})
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {selectedReport.photos.map((photo: string, index: number) => (
                          <div key={index} className="relative group">
                            <img
                              src={photo}
                              alt={`Фото ${index + 1}`}
                              className="w-full h-48 object-cover rounded-lg border-2 border-gray-200 hover:border-[#00CC00] transition-colors cursor-pointer"
                              onClick={() => window.open(photo, '_blank')}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
                              <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                              </svg>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Submission Date */}
                  <div className="mb-6">
                    <p className="text-sm text-gray-500">
                      <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Отправлено: {new Date(selectedReport.submittedAt).toLocaleString('ru-RU')}
                    </p>
                  </div>

                  {/* Rating Section */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Оценка работы (необязательно)
                    </h3>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setReportRating(star)}
                          disabled={processingReport}
                          className="transition-transform hover:scale-110 disabled:opacity-50"
                        >
                          <svg
                            className={`w-8 h-8 ${
                              star <= reportRating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                            />
                          </svg>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Feedback Section */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Комментарий (необязательно для подтверждения, обязательно для отклонения)
                    </h3>
                    <textarea
                      value={reportFeedback}
                      onChange={(e) => setReportFeedback(e.target.value)}
                      placeholder="Оставьте комментарий для волонтёра..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent resize-none"
                      rows={4}
                      maxLength={500}
                      disabled={processingReport}
                    />
                    <p className="text-sm text-gray-400 mt-1 text-right">
                      {reportFeedback.length}/500
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-6 border-t border-gray-200">
                    <button
                      onClick={handleConfirmReport}
                      disabled={processingReport}
                      className="flex-1 px-6 py-3 bg-green-500 text-white text-sm font-semibold rounded-xl hover:bg-green-600 transition-colors shadow-sm hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingReport ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>Обработка...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Подтвердить выполнение
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleRejectReport}
                      disabled={processingReport}
                      className="flex-1 px-6 py-3 bg-red-500 text-white text-sm font-semibold rounded-xl hover:bg-red-600 transition-colors shadow-sm hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingReport ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>Обработка...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Отклонить отчёт
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
