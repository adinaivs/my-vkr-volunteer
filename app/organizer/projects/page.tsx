'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import OrganizerNav from '../components/OrganizerNav';
import OrganizerSidebar from '../components/OrganizerSidebar';
import { DISPLAY_PRICE, CURRENCY } from '@/lib/pricing';
import AiSupportButton from '@/app/components/AiSupportButton';
import DynamicContent from '@/app/components/DynamicContent';
import { SidebarProvider } from '@/app/contexts/SidebarContext';
import LocationPicker from '@/app/components/LocationPicker';
import { useToast } from '@/app/components/ToastContainer';
import CustomSelect from '@/app/components/CustomSelect';
import CustomDatePicker from '@/app/components/CustomDatePicker';
import DateRangePicker from '@/app/components/DateRangePicker';
import { useTranslation } from '@/app/i18n/useTranslation';
import { Tooltip } from '@/app/components/Tooltip';

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

function OrganizerProjectsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { t } = useTranslation('organizer');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState(1); // 1: Project Info, 2: Tasks, 3: Payment/Success
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [projectData, setProjectData] = useState({
    title: '',
    category: '',
    description: '',
    image: null as File | null,
    startDate: '',
    endDate: '',
    location: '',
    latitude: null as number | null,
    longitude: null as number | null,
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
  const [categories, setCategories] = useState<Array<{id: string, slug: string, icon: string, name: string}>>([]);
  const [skills, setSkills] = useState<Array<{id: string, name: string}>>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [editStep, setEditStep] = useState(1); // Шаги редактирования: 1 - Информация, 2 - Задачи, 3 - Отправка
  const [isSubmitting, setIsSubmitting] = useState(false); // Состояние отправки проекта
  const [isPaymentLoading, setIsPaymentLoading] = useState(false); // Состояние загрузки платежа
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null); // URL загруженного фото
  const [isImageUploading, setIsImageUploading] = useState(false); // Состояние загрузки фото
  
  // Новые состояния для фильтрации и отображения
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid'); // Режим отображения
  const [searchQuery, setSearchQuery] = useState(''); // Поисковый запрос
  const [filterStatus, setFilterStatus] = useState<string>('all'); // Фильтр по статусу
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'volunteers-desc' | 'volunteers-asc'>('date-desc'); // Сортировка
  const [filterCategory, setFilterCategory] = useState<string>('all'); // Фильтр по категории
  const [showFilters, setShowFilters] = useState(false); // Показать/скрыть расширенные фильтры

  // Обработка возврата после оплаты Finik
  useEffect(() => {
    const payment = searchParams.get('payment');
    const rawProjectId = searchParams.get('projectId');
    const finikStatus = searchParams.get('status');

    // Finik добавляет ?paymentId=...&status=... к RedirectUrl через ?,
    // поэтому projectId может содержать мусор — берём только UUID до первого ?
    const projectId = rawProjectId ? rawProjectId.split('?')[0] : null;

    // Извлекаем finikPaymentId из хвоста rawProjectId (если Finik добавил ?paymentId=xxx)
    let finikPaymentId: string | null = null;
    if (rawProjectId?.includes('?')) {
      const subParams = new URLSearchParams(rawProjectId.split('?')[1]);
      finikPaymentId = subParams.get('paymentId');
    }

    if (payment === 'success' && projectId && (finikStatus === 'succeeded' || finikStatus === null)) {
      const publishProject = async () => {
        try {
          const res = await fetch(`/api/projects/${projectId}/publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ finikPaymentId }),
          });
          const data = await res.json();
          if (res.ok) {
            toast.success('Оплата прошла успешно! Проект отправлен на модерацию.');
          } else {
            if (data.error === 'Можно публиковать только черновики') {
              toast.success('Проект уже отправлен на модерацию.');
            } else {
              toast.error(data.error || 'Не удалось отправить проект на модерацию');
            }
          }
        } catch {
          toast.error('Ошибка при обработке результата оплаты');
        } finally {
          fetchProjects();
          router.replace('/organizer/projects');
        }
      };

      if (user) {
        publishProject();
      }
    }
  }, [searchParams, user]);

  // Блокировка скролла при открытии модальных окон
  useEffect(() => {
    if (showCreateModal || showEditModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showCreateModal, showEditModal]);

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

  // Загрузка проектов при изменении user
  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    fetchProjects(controller.signal);
    return () => controller.abort();
  }, [user]);

  // Обработка параметра edit из URL
  useEffect(() => {
    if (typeof window !== 'undefined' && projects.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const editId = params.get('edit');
      if (editId) {
        const projectToEdit = projects.find(p => p.id === editId);
        if (projectToEdit && (projectToEdit.status === 'draft' || projectToEdit.status === 'rejected')) {
          handleEditProject(projectToEdit);
          // Очищаем параметр из URL
          window.history.replaceState({}, '', '/organizer/projects');
        }
      }
    }
  }, [projects]);

  // Функция фильтрации и сортировки проектов
  const getFilteredAndSortedProjects = () => {
    let filtered = [...projects];
    console.log('All projects before filtering:', filtered.length, filtered.map(p => ({ title: p.title, status: p.status })));

    // Фильтр по поисковому запросу (по имени и описанию)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(project => 
        project.title.toLowerCase().includes(query) || 
        project.description.toLowerCase().includes(query)
      );
      console.log('After search filter:', filtered.length);
    }

    // Фильтр по статусу
    if (filterStatus !== 'all') {
      filtered = filtered.filter(project => project.status === filterStatus);
      console.log('After status filter:', filterStatus, filtered.length);
    }

    // Фильтр по категории
    if (filterCategory !== 'all') {
      filtered = filtered.filter(project => project.categoryId === filterCategory);
      console.log('After category filter:', filtered.length);
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

    console.log('Final filtered projects:', filtered.length, filtered.map(p => ({ title: p.title, status: p.status })));
    return filtered;
  };

  // Функция сброса всех фильтров
  const resetFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setSortBy('date-desc');
    setFilterCategory('all');
  };

  const fetchProjects = async (signal?: AbortSignal) => {
    if (!user) return;

    try {
      setLoadingProjects(true);

      // Загружаем все проекты организатора без фильтрации по статусу
      const url = `/api/projects?organizerId=${user.id}`;
      console.log('Fetching projects from:', url);

      const response = await fetch(url, { signal });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Received projects:', data.projects);
        setProjects(data.projects || []);

        // Авто-активация: запускаем для всех upcoming проектов у которых наступила дата начала
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcomingReady = (data.projects || []).filter((p: any) => {
          if (p.status !== 'upcoming') return false;
          const sd = new Date(p.startDate);
          sd.setHours(0, 0, 0, 0);
          return sd <= today;
        });
        if (upcomingReady.length > 0) {
          Promise.all(
            upcomingReady.map((p: any) =>
              fetch(`/api/organizer/projects/${p.id}/auto-activate`, {
                method: 'POST',
                credentials: 'include',
              }).then(r => r.json()).catch(() => null)
            )
          ).then(results => {
            if (results.some((r: any) => r?.activated)) {
              // Перезагружаем список если хоть один проект активирован
              fetchProjects();
            }
          });
        }
      } else {
        console.error('Error fetching projects, status:', response.status);
        setProjects([]);
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') return; // Нормальная отмена при размонтировании
      console.error('Error fetching projects:', error);
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProjectData({ ...projectData, image: file });
    setUploadedImageUrl(null);
    setIsImageUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('/api/upload/image', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) {
        setUploadedImageUrl(data.imageUrl);
      } else {
        toast.error(data.error || 'Ошибка загрузки фото');
        setProjectData(prev => ({ ...prev, image: null }));
      }
    } catch {
      toast.error('Ошибка загрузки фото');
      setProjectData(prev => ({ ...prev, image: null }));
    } finally {
      setIsImageUploading(false);
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
      if (projectData.latitude !== null) {
        formData.append('latitude', projectData.latitude.toString());
      }
      if (projectData.longitude !== null) {
        formData.append('longitude', projectData.longitude.toString());
      }
      formData.append('maxVolunteers', projectData.maxVolunteers);
      formData.append('isPaid', 'false');

      // Фото: если уже загружено в S3 — передаём URL, иначе файл
      if (uploadedImageUrl) {
        formData.append('imageUrl', uploadedImageUrl);
      } else if (projectData.image) {
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
          toast.warning(result.message || 'Ваш аккаунт еще не подтвержден администратором');
          setShowCreateModal(false);
          resetForm();
          return;
        }
        
        toast.error(result.error || 'Ошибка при сохранении черновика');
        return;
      }

      toast.success('Проект сохранён как черновик');
      setShowCreateModal(false);
      resetForm();
      
      // Перезагружаем страницу через 2 секунды, чтобы пользователь успел прочитать сообщение
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Произошла ошибка при сохранении черновика');
    }
  };

  const handleNextStep = () => {
    if (createStep === 1) {
      // Validate project data
      if (!projectData.title || !projectData.category || !projectData.description) {
        toast.error('Пожалуйста, заполните все обязательные поля');
        return;
      }
      setCreateStep(2);
    } else if (createStep === 2) {
      // Проверяем, что все волонтёры распределены по задачам
      const totalVolunteersInTasks = tasks.reduce((sum, task) => sum + task.requiredVolunteers, 0);
      const maxVolunteers = parseInt(projectData.maxVolunteers) || 0;
      
      if (totalVolunteersInTasks !== maxVolunteers) {
        if (totalVolunteersInTasks < maxVolunteers) {
          toast.error(`Необходимо распределить всех волонтёров по задачам. Осталось: ${maxVolunteers - totalVolunteersInTasks}`);
        } else {
          toast.error(`Превышено максимальное количество волонтёров. Уменьшите на: ${totalVolunteersInTasks - maxVolunteers}`);
        }
        return;
      }
      
      // Move to payment/success step
      setCreateStep(3);
    }
  };

  const handleAddTask = () => {
    if (!currentTask.title || !currentTask.description) {
      toast.error('Пожалуйста, заполните название и описание задачи');
      return;
    }

    const requiredVolunteersForTask = parseInt(currentTask.requiredVolunteers) || 1;
    const maxVolunteers = parseInt(projectData.maxVolunteers) || 0;
    
    // Подсчитываем текущую сумму волонтёров по всем задачам
    const currentTotalVolunteers = tasks.reduce((sum, task) => sum + task.requiredVolunteers, 0);
    
    // Проверяем, не превысит ли добавление новой задачи максимум
    if (currentTotalVolunteers + requiredVolunteersForTask > maxVolunteers) {
      toast.error(`Сумма волонтёров по задачам (${currentTotalVolunteers + requiredVolunteersForTask}) превышает максимальное количество волонтёров проекта (${maxVolunteers})`);
      return;
    }

    const newTask: Task = {
      id: Date.now().toString(),
      title: currentTask.title,
      description: currentTask.description,
      requiredSkill: currentTask.requiredSkill,
      requiredVolunteers: requiredVolunteersForTask,
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
    setShowTaskForm(false);
  };

  const handleRemoveTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
  };

  const handleEditTask = (taskId: string) => {
    const taskToEdit = tasks.find(t => t.id === taskId);
    if (taskToEdit) {
      setCurrentTask({
        title: taskToEdit.title,
        description: taskToEdit.description,
        requiredSkill: taskToEdit.requiredSkill,
        requiredVolunteers: taskToEdit.requiredVolunteers.toString(),
        deadline: taskToEdit.deadline,
      });
      // Удаляем задачу из списка, чтобы после редактирования добавить заново
      setTasks(tasks.filter(t => t.id !== taskId));
    }
  };

  const handleSubmitProject = async () => {
    try {
      setIsSubmitting(true);
      
      // Создаем FormData для отправки файла
      const formData = new FormData();
      formData.append('title', projectData.title);
      formData.append('description', projectData.description);
      formData.append('categoryId', projectData.category);
      formData.append('startDate', projectData.startDate);
      formData.append('endDate', projectData.endDate);
      formData.append('location', projectData.location);
      if (projectData.latitude !== null) {
        formData.append('latitude', projectData.latitude.toString());
      }
      if (projectData.longitude !== null) {
        formData.append('longitude', projectData.longitude.toString());
      }
      formData.append('maxVolunteers', projectData.maxVolunteers);
      formData.append('isPaid', 'false');

      // Фото: если уже загружено в S3 — передаём URL, иначе файл
      if (uploadedImageUrl) {
        formData.append('imageUrl', uploadedImageUrl);
      } else if (projectData.image) {
        formData.append('image', projectData.image);
      }

      // Добавляем задачи, если они есть
      if (tasks.length > 0) {
        formData.append('tasks', JSON.stringify(tasks));
      }

      // Создаем проект
      const projectResponse = await fetch('/api/projects', {
        method: 'POST',
        body: formData,
      });

      const projectResult = await projectResponse.json();

      if (!projectResponse.ok) {
        if (projectResult.code === 'ORGANIZER_NOT_APPROVED') {
          toast.warning(projectResult.message || 'Ваш аккаунт еще не подтвержден администратором');
          setShowCreateModal(false);
          resetForm();
          return;
        }
        
        toast.error(projectResult.error || 'Ошибка при создании проекта');
        return;
      }

      const projectId = projectResult.project.id;

      // Отправляем проект на модерацию (бесплатные публикации)
      const publishResponse = await fetch(`/api/projects/${projectId}/publish`, {
        method: 'POST',
      });

      const publishResult = await publishResponse.json();

      if (!publishResponse.ok) {
        toast.error(publishResult.error || 'Ошибка при отправке на модерацию');
        return;
      }

      toast.success('Проект успешно отправлен на модерацию! Администратор проверит его в течение 1-3 дней.');
      setShowCreateModal(false);
      resetForm();
      
      // Перезагружаем страницу через 2 секунды, чтобы пользователь успел прочитать сообщение
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error submitting project:', error);
      toast.error('Произошла ошибка при отправке проекта');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCreateStep(1);
    setShowTaskForm(false);
    setUploadedImageUrl(null);
    setIsImageUploading(false);
    setProjectData({
      title: '',
      category: '',
      description: '',
      image: null,
      startDate: '',
      endDate: '',
      location: '',
      latitude: null,
      longitude: null,
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

  const handlePayment = async () => {
    if (!user) return;
    try {
      setIsPaymentLoading(true);

      const formData = new FormData();
      formData.append('title', projectData.title);
      formData.append('description', projectData.description);
      formData.append('categoryId', projectData.category);
      formData.append('startDate', projectData.startDate);
      formData.append('endDate', projectData.endDate);
      formData.append('location', projectData.location);
      if (projectData.latitude !== null) {
        formData.append('latitude', projectData.latitude.toString());
      }
      if (projectData.longitude !== null) {
        formData.append('longitude', projectData.longitude.toString());
      }
      formData.append('maxVolunteers', projectData.maxVolunteers);
      formData.append('isPaid', 'false');

      if (uploadedImageUrl) {
        formData.append('imageUrl', uploadedImageUrl);
      } else if (projectData.image) {
        formData.append('image', projectData.image);
      }

      if (tasks.length > 0) {
        formData.append('tasks', JSON.stringify(tasks));
      }

      const projectResponse = await fetch('/api/projects', {
        method: 'POST',
        body: formData,
      });

      const projectResult = await projectResponse.json();

      if (!projectResponse.ok) {
        if (projectResult.code === 'ORGANIZER_NOT_APPROVED') {
          toast.warning(projectResult.message || 'Ваш аккаунт еще не подтвержден администратором');
          setShowCreateModal(false);
          resetForm();
          return;
        }
        toast.error(projectResult.error || 'Ошибка при создании проекта');
        return;
      }

      const projectId = projectResult.project.id;

      const paymentResponse = await fetch('/api/finik/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workId: projectId,
          workTopic: projectData.title,
          userId: user.id,
        }),
      });

      const paymentData = await paymentResponse.json();

      if (!paymentResponse.ok) {
        toast.error(paymentData.error || 'Ошибка при создании платежа');
        return;
      }

      if (paymentData.paymentUrl) {
        window.location.href = paymentData.paymentUrl;
      } else {
        toast.error('Не удалось получить ссылку на оплату');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Произошла ошибка при создании платежа');
    } finally {
      setIsPaymentLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    toast.confirm(
      'Вы уверены, что хотите удалить этот проект? Это действие нельзя отменить.',
      async () => {
        try {
          const response = await fetch(`/api/projects/${projectId}`, {
            method: 'DELETE',
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
        }
      },
      'error'
    );
  };

  const handleResubmitProject = async (projectId: string) => {
    toast.confirm(
      'Отправить проект на модерацию повторно? Убедитесь, что вы внесли все необходимые изменения.',
      async () => {
        try {
          const response = await fetch(`/api/projects/${projectId}/resubmit`, {
            method: 'POST',
          });

          const data = await response.json();

          if (response.ok) {
            toast.success('Проект успешно отправлен на модерацию! Администратор проверит его в течение 1-3 дней.');
            fetchProjects();
          } else {
            toast.error(data.error || 'Ошибка при отправке проекта на модерацию');
          }
        } catch (error) {
          console.error('Error resubmitting project:', error);
          toast.error('Произошла ошибка при отправке проекта');
        }
      },
      'info'
    );
  };

  const handlePublishDraft = async (projectId: string) => {
    // Если бесплатных публикаций нет — сначала оплата
    if (freePostsRemaining <= 0) {
      toast.confirm(
        `У вас закончились бесплатные публикации. Стоимость публикации — ${DISPLAY_PRICE} ${CURRENCY}. Перейти к оплате?`,
        async () => {
          try {
            const draftProject = projects.find((p: any) => p.id === projectId);
            const paymentResponse = await fetch('/api/finik/create-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                workId: projectId,
                workTopic: draftProject?.title || 'Проект',
                userId: user?.id,
              }),
            });
            const paymentData = await paymentResponse.json();
            if (!paymentResponse.ok) {
              toast.error(paymentData.error || 'Ошибка при создании платежа');
              return;
            }
            if (paymentData.paymentUrl) {
              window.location.href = paymentData.paymentUrl;
            } else {
              toast.error('Не удалось получить ссылку на оплату');
            }
          } catch (error) {
            console.error('Payment error:', error);
            toast.error('Произошла ошибка при создании платежа');
          }
        },
        'warning'
      );
      return;
    }

    // Бесплатная публикация
    toast.confirm(
      'Отправить черновик на модерацию? Убедитесь, что все данные заполнены корректно.',
      async () => {
        try {
          const response = await fetch(`/api/projects/${projectId}/publish`, {
            method: 'POST',
          });

          const data = await response.json();

          if (response.ok) {
            toast.success('Проект успешно отправлен на модерацию! Администратор проверит его в течение 1-3 дней.');
            fetchProjects();
          } else {
            toast.error(data.error || 'Ошибка при отправке проекта на модерацию');
          }
        } catch (error) {
          console.error('Error publishing draft:', error);
          toast.error('Произошла ошибка при отправке проекта');
        }
      },
      'info'
    );
  };

  const handleEditProject = async (project: any) => {
    // Загружаем полные данные проекта
    try {
      const response = await fetch(`/api/projects/${project.id}`);
      if (response.ok) {
        const data = await response.json();
        setEditingProject(data.project);
        
        // Извлекаем уникальные навыки из задач проекта
        const tasksResponse = await fetch(`/api/projects/${project.id}/tasks`);
        let projectRequiredSkills: string[] = [];
        let formattedTasks: Task[] = [];
        
        if (tasksResponse.ok) {
          const tasksData = await tasksResponse.json();
          formattedTasks = tasksData.tasks.map((task: any) => ({
            id: task.id,
            title: task.title,
            description: task.description,
            requiredSkill: task.requiredSkill?.name || '',
            requiredVolunteers: task.requiredVolunteers,
            deadline: task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '',
          }));
          
          // Собираем уникальные навыки из задач
          const skillsSet = new Set<string>();
          tasksData.tasks.forEach((task: any) => {
            if (task.requiredSkill?.name) {
              skillsSet.add(task.requiredSkill.name);
            }
          });
          projectRequiredSkills = Array.from(skillsSet);
        }
        
        // Заполняем форму данными проекта
        setProjectData({
          title: data.project.title,
          category: data.project.categoryId,
          description: data.project.description,
          image: null,
          startDate: new Date(data.project.startDate).toISOString().split('T')[0],
          endDate: new Date(data.project.endDate).toISOString().split('T')[0],
          location: data.project.location,
          latitude: data.project.latitude ? parseFloat(data.project.latitude) : null,
          longitude: data.project.longitude ? parseFloat(data.project.longitude) : null,
          maxVolunteers: data.project.maxVolunteers.toString(),
          requiredSkills: projectRequiredSkills,
        });
        
        setTasks(formattedTasks);
        setEditStep(1);
        setShowEditModal(true);
      }
    } catch (error) {
      console.error('Error loading project:', error);
      toast.error('Ошибка при загрузке данных проекта');
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
      if (projectData.latitude !== null) {
        formData.append('latitude', projectData.latitude.toString());
      }
      if (projectData.longitude !== null) {
        formData.append('longitude', projectData.longitude.toString());
      }
      formData.append('maxVolunteers', projectData.maxVolunteers);

      // Фото: если уже загружено в S3 — передаём URL, иначе файл
      if (uploadedImageUrl) {
        formData.append('imageUrl', uploadedImageUrl);
      } else if (projectData.image) {
        formData.append('image', projectData.image);
      }

      // Добавляем новые задачи, если они есть
      if (tasks.length > 0) {
        formData.append('tasks', JSON.stringify(tasks));
      }

      const response = await fetch(`/api/projects/${editingProject.id}`, {
        method: 'PUT',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || 'Ошибка при обновлении проекта');
        return;
      }

      toast.success('Проект успешно обновлен! Теперь вы можете отправить его на модерацию.');
      setShowEditModal(false);
      setEditingProject(null);
      resetForm();
      fetchProjects(); // Перезагружаем список проектов
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Произошла ошибка при обновлении проекта');
    }
  };

  const getStatusBadge = (status: string): { label: string; bg: string; text: string } => {
    const map: Record<string, { label: string; bg: string; text: string }> = {
      draft:      { label: 'Черновик',         bg: 'bg-gray-500',   text: 'text-white' },
      moderation: { label: 'На проверке',      bg: 'bg-orange-500', text: 'text-white' },
      rejected:   { label: 'Отклонен',         bg: 'bg-red-500',    text: 'text-white' },
      recruiting: { label: 'Набор волонтеров', bg: 'bg-green-500',  text: 'text-white' },
      upcoming:   { label: 'Скоро начнется',   bg: 'bg-blue-500',   text: 'text-white' },
      active:     { label: 'Активный',         bg: 'bg-purple-500', text: 'text-white' },
      completed:  { label: 'Завершён',         bg: 'bg-blue-400',   text: 'text-white' },
      cancelled:  { label: 'Отменен',          bg: 'bg-red-400',    text: 'text-white' },
      blocked:    { label: 'Заблокирован',     bg: 'bg-red-600',    text: 'text-white' },
    };
    return map[status] || { label: status, bg: 'bg-gray-500', text: 'text-white' };
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
        <OrganizerSidebar user={user} />
        <OrganizerNav user={user} />

        {/* Main Content */}
        <DynamicContent>
        {/* Page Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-8 gap-2">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold text-gray-900 sm:mb-2 leading-tight">{t.projects?.title || 'Мои проекты'}</h1>
            <p className="text-gray-600 text-xs sm:text-sm hidden sm:block">Управляйте своими волонтёрскими проектами</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/organizer/payments"
              className="px-3 sm:px-5 py-2 sm:py-3 border border-gray-300 text-gray-700 rounded-full text-xs sm:text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Платежи
            </Link>
            <button
              onClick={() => {
                if (!isApproved) {
                  toast.warning('Ваш аккаунт еще не подтвержден администратором. Для создания проектов необходимо дождаться подтверждения вашего аккаунта. Обычно это занимает 1-2 рабочих дня.');
                  return;
                }
                setShowCreateModal(true);
              }}
              className="px-3 sm:px-6 py-2 sm:py-3 bg-[#00CC00] text-white rounded-full text-xs sm:text-sm font-medium hover:bg-[#00b300] transition-colors flex items-center gap-1.5 shadow-lg"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">{t.projects?.createNew || 'Создать проект'}</span>
              <span className="sm:hidden">Создать</span>
            </button>
          </div>
        </div>

        {/* Единый контейнер для поиска и фильтров */}
        <div className="bg-white rounded-xl shadow-xl border border-gray-300 mb-3 sm:mb-4 md:mb-6 p-2.5 sm:p-3 md:p-4">
          {/* Верхняя панель: Поиск + Кнопки отображения + Сброс */}
          <div className="flex gap-1.5 sm:gap-2 mb-2.5 sm:mb-3">
            {/* Поисковая строка */}
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder={t.projects?.searchPlaceholder || 'Поиск по названию...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 sm:pl-9 pr-2 sm:pr-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00CC00] focus:border-transparent"
              />
              <svg
                className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Кнопка-тогл список/сетка */}
            <Tooltip text={viewMode === 'grid' ? 'Переключить на список' : 'Переключить на блоки'}>
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-1.5 sm:p-2 rounded-lg border bg-[#00CC00] text-white border-[#00CC00] transition-colors hover:bg-[#00b300] flex-shrink-0"
              >
                {viewMode === 'list' ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                )}
              </button>
            </Tooltip>

            {/* Кнопка сброса — только если активен хотя бы один фильтр */}
            {(searchQuery || filterStatus !== 'all' || filterCategory !== 'all' || sortBy !== 'date-desc') && (
              <Tooltip text="Сбросить фильтры">
                <button
                  onClick={resetFilters}
                  className="p-1.5 sm:p-2 bg-gray-100 text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-200 transition-colors flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </Tooltip>
            )}
          </div>

          {/* Разделитель */}
          <div className="border-t border-gray-100 my-2 sm:my-2.5"></div>

          {/* Кнопка показать/скрыть фильтры */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full px-2.5 sm:px-3 py-1.5 text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-between text-xs sm:text-sm font-medium rounded-lg"
          >
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>{showFilters ? 'Скрыть фильтры' : 'Показать фильтры'}</span>
            </div>
            <svg
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Панель фильтров */}
          {showFilters && (
            <div className="pt-2.5 sm:pt-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
                {/* Фильтр по статусу */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 sm:mb-1.5">
                    {t.projects?.filterStatus || 'Статус'}
                  </label>
                  <CustomSelect
                    options={[
                      { value: 'all', label: t.projects?.allStatuses || 'Все' },
                      { value: 'draft', label: t.status?.draft || 'Черновики' },
                      { value: 'moderation', label: t.status?.moderation || 'На модерации' },
                      { value: 'rejected', label: t.status?.rejected || 'Отклоненные' },
                      { value: 'recruiting', label: t.status?.recruiting || 'Набор волонтеров' },
                      { value: 'upcoming', label: t.status?.upcoming || 'Скоро начнется' },
                      { value: 'active', label: t.status?.active || 'Активные' },
                      { value: 'completed', label: t.status?.completed || 'Завершенные' },
                      { value: 'cancelled', label: t.status?.cancelled || 'Отмененные' },
                      { value: 'blocked', label: t.status?.blocked || 'Заблокированные' },
                    ]}
                    value={filterStatus}
                    onChange={setFilterStatus}
                    placeholder="Все"
                  />
                </div>

                {/* Сортировка */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 sm:mb-1.5">
                    Сортировка
                  </label>
                  <CustomSelect
                    options={[
                      { value: 'date-desc', label: 'Дата: сначала новые' },
                      { value: 'date-asc', label: 'Дата: сначала старые' },
                      { value: 'name-asc', label: 'Название: А-Я' },
                      { value: 'name-desc', label: 'Название: Я-А' },
                      { value: 'volunteers-desc', label: 'Волонтёры: по убыванию' },
                      { value: 'volunteers-asc', label: 'Волонтёры: по возрастанию' },
                    ]}
                    value={sortBy}
                    onChange={(value) => setSortBy(value as any)}
                    placeholder="Сортировка"
                  />
                </div>

                {/* Фильтр по категории */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 sm:mb-1.5">
                    Категория
                  </label>
                  <CustomSelect
                    options={[
                      { value: 'all', label: 'Все категории' },
                      ...categories.map((cat) => ({
                        value: cat.id,
                        label: cat.name
                      }))
                    ]}
                    value={filterCategory}
                    onChange={setFilterCategory}
                    placeholder="Все категории"
                  />
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
                : (t.projects?.noProjects || 'У вас пока нет проектов')}
            </h3>
            <p className="text-gray-600 max-w-md mx-auto mb-8">
              {searchQuery || filterStatus !== 'all' || filterCategory !== 'all'
                ? 'Попробуйте изменить параметры поиска или фильтры'
                : (t.projects?.noProjectsHint || 'Создайте свой первый волонтёрский проект и начните привлекать волонтёров для реализации ваших идей')}
            </p>
            {!searchQuery && filterStatus === 'all' && filterCategory === 'all' && (
              <button
                onClick={() => {
                  if (!isApproved) {
                    toast.warning('Ваш аккаунт еще не подтвержден администратором. Для создания проектов необходимо дождаться подтверждения вашего аккаунта. Обычно это занимает 1-2 рабочих дня.');
                    return;
                  }
                  setShowCreateModal(true);
                }}
                className="inline-block px-8 py-3 bg-[#00CC00] text-white rounded-full font-medium hover:bg-[#00b300] transition-colors"
              >
                {t.projects?.createNew || 'Создать первый проект'}
              </button>
            )}
          </div>
        ) : (
          /* Projects List/Grid */
          <div>
            {/* Режим списка */}
            {viewMode === 'list' && (
              <div className="space-y-2 sm:space-y-3">
                {getFilteredAndSortedProjects().map((project) => (
                  <div
                    key={project.id}
                    className="bg-white border border-gray-300 rounded-lg p-3 sm:p-4 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer"
                    onClick={() => router.push(`/organizer/projects/${project.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      {/* Изображение проекта с бейджем статуса */}
                      {project.imageUrl ? (
                        <div className="relative flex-shrink-0">
                          <img
                            src={project.imageUrl}
                            alt={project.title}
                            className="w-14 h-14 sm:w-20 sm:h-20 object-cover rounded-lg"
                          />
                          {(() => { const b = getStatusBadge(project.status); return (
                            <span className={`absolute top-1 right-1 px-1 py-0.5 ${b.bg} ${b.text} text-[9px] sm:text-xs font-medium rounded-full whitespace-nowrap leading-tight`}>
                              {b.label}
                            </span>
                          ); })()}
                        </div>
                      ) : (
                        <div className="relative flex-shrink-0">
                          <div className="w-14 h-14 sm:w-20 sm:h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center">
                            <svg className="w-7 h-7 sm:w-10 sm:h-10 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          {(() => { const b = getStatusBadge(project.status); return (
                            <span className={`absolute top-1 right-1 px-1 py-0.5 ${b.bg} ${b.text} text-[9px] sm:text-xs font-medium rounded-full whitespace-nowrap leading-tight`}>
                              {b.label}
                            </span>
                          ); })()}
                        </div>
                      )}

                      {/* Информация о проекте */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-lg font-semibold text-gray-900 truncate mb-0.5">{project.title}</h3>
                        <p className="text-xs text-gray-500 mb-1.5 line-clamp-1 hidden sm:block">{project.description}</p>
                        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            <span className="truncate max-w-[80px] sm:max-w-none">{project.location}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            {project.currentVolunteers}/{project.maxVolunteers}
                          </div>
                          <div className="flex items-center gap-1">
                            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(project.startDate).toLocaleDateString('ru-RU')}
                          </div>
                        </div>
                      </div>

                      {/* Стрелка */}
                      <div className="flex-shrink-0">
                        <svg className="w-4 h-4 sm:w-6 sm:h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                {getFilteredAndSortedProjects().map((project) => (
                  <div
                    key={project.id}
                    className="bg-white border border-gray-300 rounded-xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer"
                    onClick={() => router.push(`/organizer/projects/${project.id}`)}
                  >
                    {/* Изображение с бейджем статуса */}
                    <div className="relative">
                      {project.imageUrl ? (
                        <img
                          src={project.imageUrl}
                          alt={project.title}
                          className="w-full h-24 sm:h-40 object-cover"
                        />
                      ) : (
                        <div className="w-full h-24 sm:h-40 bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                          <svg className="w-8 h-8 sm:w-16 sm:h-16 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      {(() => { const b = getStatusBadge(project.status); return (
                        <span className={`absolute top-1.5 right-1.5 sm:top-2 sm:right-2 px-1.5 sm:px-2.5 py-0.5 sm:py-1 ${b.bg} ${b.text} text-[10px] sm:text-xs font-semibold rounded-full whitespace-nowrap shadow`}>
                          {b.label}
                        </span>
                      ); })()}
                    </div>

                    {/* Контент */}
                    <div className="p-2.5 sm:p-5">
                      {/* Заголовок */}
                      <div className="mb-2 sm:mb-4">
                        <h3 className="text-xs sm:text-lg font-bold text-gray-900 line-clamp-2">{project.title}</h3>
                      </div>

                      {/* Локация и дата */}
                      <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-600 mb-2 sm:mb-4">
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          <span className="truncate">{project.location}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{new Date(project.startDate).toLocaleDateString('ru-RU')}</span>
                        </div>
                      </div>

                      {/* Стрелка */}
                      <div className="flex items-center justify-end">
                        <svg className="w-4 h-4 sm:w-6 sm:h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div className="max-h-[70vh] overflow-y-auto px-8 py-2">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Информация о проекте</h3>
                
                <div className="space-y-4">
                  {/* Project Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Название проекта *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Например: Помощь детскому дому"
                      value={projectData.title}
                      onChange={(e) => setProjectData({ ...projectData, title: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00CC00] focus:border-[#00CC00]"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Категория проекта *
                    </label>
                    <CustomSelect
                      options={[
                        { value: '', label: 'Выберите категорию' },
                        ...categories.map((cat) => ({
                          value: cat.id,
                          label: cat.name
                        }))
                      ]}
                      value={projectData.category}
                      onChange={(value) => setProjectData({ ...projectData, category: value })}
                      placeholder="Выберите категорию"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Описание проекта *
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Опишите цели, задачи и ожидаемые результаты проекта..."
                      value={projectData.description}
                      onChange={(e) => setProjectData({ ...projectData, description: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00CC00] focus:border-[#00CC00] resize-none"
                    />
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Фотография проекта
                    </label>
                    <label className="block cursor-pointer">
                      <div className={`w-full px-3 py-2 bg-gray-50 border-2 border-dashed rounded-lg transition-colors flex items-center gap-3 ${
                        uploadedImageUrl ? 'border-[#00CC00] bg-green-50' : isImageUploading ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-[#00CC00]'
                      }`}>
                        {isImageUploading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 flex-shrink-0" />
                            <span className="text-sm text-blue-600">Загрузка в облако...</span>
                          </>
                        ) : uploadedImageUrl ? (
                          <>
                            <img src={uploadedImageUrl} alt="preview" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-green-700 truncate">{projectData.image?.name}</p>
                              <p className="text-xs text-green-600">Загружено в облако ✓</p>
                            </div>
                            <svg className="w-5 h-5 text-[#00CC00] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm text-gray-600">Выберите изображение</span>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isImageUploading}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Dates */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Период проекта *
                    </label>
                    <DateRangePicker
                      startDate={projectData.startDate}
                      endDate={projectData.endDate}
                      onStartChange={(value) => setProjectData({ ...projectData, startDate: value })}
                      onEndChange={(value) => setProjectData({ ...projectData, endDate: value })}
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Локация *
                    </label>
                    <LocationPicker
                      value={projectData.location}
                      onChange={(location, lat, lon) => {
                        setProjectData({ 
                          ...projectData, 
                          location,
                          latitude: lat || null,
                          longitude: lon || null
                        });
                      }}
                      placeholder="Например: Бишкек, ул. Чуй 123"
                    />
                  </div>

                  {/* Max Volunteers */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Максимальное количество волонтёров *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="Например: 10"
                      value={projectData.maxVolunteers}
                      onChange={(e) => setProjectData({ ...projectData, maxVolunteers: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00CC00] focus:border-[#00CC00]"
                    />
                  </div>

                  {/* Required Skills */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Требуемые навыки
                    </label>
                    <div className="flex gap-2 mb-3">
                      <CustomSelect
                        options={[
                          { value: '', label: 'Выберите навык' },
                          ...skills.map((skill) => ({
                            value: skill.name,
                            label: skill.name
                          }))
                        ]}
                        value=""
                        onChange={(value) => {
                          if (value) {
                            handleAddSkill(value);
                          }
                        }}
                        placeholder="Выберите навык"
                        className="flex-1"
                      />
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
              <div className="max-h-[70vh] overflow-y-auto px-8 py-2">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Задачи проекта</h3>
                <p className="text-gray-600 mb-4">Добавьте задачи, которые нужно выполнить в рамках проекта</p>

                {/* Индикатор распределения волонтёров */}
                {projectData.maxVolunteers && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-blue-900">
                        Распределение волонтёров
                      </span>
                      <span className="text-sm font-bold text-blue-900">
                        {tasks.reduce((sum, task) => sum + task.requiredVolunteers, 0)} / {projectData.maxVolunteers}
                      </span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all ${
                          tasks.reduce((sum, task) => sum + task.requiredVolunteers, 0) > parseInt(projectData.maxVolunteers)
                            ? 'bg-red-500'
                            : tasks.reduce((sum, task) => sum + task.requiredVolunteers, 0) === parseInt(projectData.maxVolunteers)
                            ? 'bg-green-500'
                            : 'bg-blue-500'
                        }`}
                        style={{ 
                          width: `${Math.min((tasks.reduce((sum, task) => sum + task.requiredVolunteers, 0) / parseInt(projectData.maxVolunteers)) * 100, 100)}%` 
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-blue-700 mt-2">
                      {tasks.reduce((sum, task) => sum + task.requiredVolunteers, 0) === parseInt(projectData.maxVolunteers)
                        ? '✓ Все волонтёры распределены'
                        : tasks.reduce((sum, task) => sum + task.requiredVolunteers, 0) > parseInt(projectData.maxVolunteers)
                        ? '⚠ Превышено максимальное количество волонтёров'
                        : `Осталось распределить: ${parseInt(projectData.maxVolunteers) - tasks.reduce((sum, task) => sum + task.requiredVolunteers, 0)} волонтёр(ов)`
                      }
                    </p>
                  </div>
                )}

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

                {/* Add Task Form — показывается только по кнопке */}
                {showTaskForm && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-4">
                    <h4 className="font-bold text-gray-900 mb-4">Новая задача</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Название задачи *
                        </label>
                        <input
                          type="text"
                          placeholder="Например: Уборка территории"
                          value={currentTask.title}
                          onChange={(e) => setCurrentTask({ ...currentTask, title: e.target.value })}
                          className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00CC00] focus:border-[#00CC00]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Описание задачи *
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Опишите, что нужно сделать..."
                          value={currentTask.description}
                          onChange={(e) => setCurrentTask({ ...currentTask, description: e.target.value })}
                          className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00CC00] focus:border-[#00CC00] resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Требуемый навык
                          </label>
                          <CustomSelect
                            options={[
                              { value: '', label: 'Не требуется' },
                              ...projectData.requiredSkills.map((skill) => ({
                                value: skill,
                                label: skill
                              }))
                            ]}
                            value={currentTask.requiredSkill}
                            onChange={(value) => setCurrentTask({ ...currentTask, requiredSkill: value })}
                            placeholder="Не требуется"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Количество волонтёров *
                          </label>
                          <input
                            type="number"
                            min="1"
                            placeholder="1"
                            value={currentTask.requiredVolunteers}
                            onChange={(e) => setCurrentTask({ ...currentTask, requiredVolunteers: e.target.value })}
                            className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00CC00] focus:border-[#00CC00]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Дедлайн
                          </label>
                          <CustomDatePicker
                            value={currentTask.deadline}
                            onChange={(value) => {
                              if (projectData.startDate && projectData.endDate) {
                                if (value < projectData.startDate || value > projectData.endDate) {
                                  toast.error(`Дедлайн задачи должен быть между ${new Date(projectData.startDate).toLocaleDateString('ru-RU')} и ${new Date(projectData.endDate).toLocaleDateString('ru-RU')}`);
                                  return;
                                }
                              }
                              setCurrentTask({ ...currentTask, deadline: value });
                            }}
                            placeholder="Выберите дедлайн"
                            minDate={projectData.startDate}
                            maxDate={projectData.endDate}
                          />
                          {projectData.startDate && projectData.endDate && (
                            <p className="text-xs text-gray-500 mt-1">
                              Период: {new Date(projectData.startDate).toLocaleDateString('ru-RU')} — {new Date(projectData.endDate).toLocaleDateString('ru-RU')}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowTaskForm(false);
                            setCurrentTask({ title: '', description: '', requiredSkill: '', requiredVolunteers: '', deadline: '' });
                          }}
                          className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                        >
                          Отмена
                        </button>
                        <button
                          type="button"
                          onClick={handleAddTask}
                          className="px-4 py-2 bg-[#00CC00] text-white rounded-lg text-sm font-medium hover:bg-[#00b300] transition-colors flex items-center gap-1.5"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Сохранить задачу
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Кнопка добавить задачу */}
                {!showTaskForm && (
                  <button
                    type="button"
                    onClick={() => setShowTaskForm(true)}
                    className="flex items-center gap-2 w-full justify-center px-4 py-3 border-2 border-dashed border-[#00CC00]/40 text-[#00CC00] rounded-xl text-sm font-medium hover:border-[#00CC00] hover:bg-[#00CC00]/5 transition-colors mb-4"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Добавить задачу
                  </button>
                )}

                {tasks.length === 0 && !showTaskForm && (
                  <div className="text-center py-6 text-gray-400">
                    <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

            {/* Step 3: Payment */}
            {createStep === 3 && (
              <div className="max-h-[70vh] overflow-y-auto px-8 py-2">
                <div className="py-6 max-w-md mx-auto">

                  {/* Заголовок */}
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-[#00CC00]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Оплата публикации</h3>
                    <p className="text-sm text-gray-500 mt-1">Проект «{projectData.title}»</p>
                  </div>

                  {/* Карточка с ценой */}
                  <div className="bg-white border-2 border-[#00CC00] rounded-2xl p-6 mb-5">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-500">Публикация проекта</span>
                      <span className="text-2xl font-bold text-gray-900">{DISPLAY_PRICE} {CURRENCY}</span>
                    </div>
                    <div className="h-px bg-gray-100 mb-4" />
                    <div className="space-y-2">
                      {[
                        'Размещение проекта на платформе',
                        'Доступ к базе волонтёров',
                        'Приоритетная модерация',
                        'Проект активен 30 дней',
                      ].map((item) => (
                        <div key={item} className="flex items-center gap-2 text-sm text-gray-600">
                          <svg className="w-4 h-4 text-[#00CC00] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Бесплатные публикации */}
                  {freePostsRemaining > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-5 flex items-center gap-3">
                      <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-green-800">
                        У вас есть <span className="font-bold">{freePostsRemaining} бесплатных</span> публикации — можно отправить на модерацию без оплаты.
                      </p>
                    </div>
                  )}

                  {/* Кнопки */}
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={freePostsRemaining > 0 ? handleSubmitProject : handlePayment}
                      disabled={isSubmitting || isPaymentLoading}
                      className="w-full py-3 bg-[#00CC00] text-white rounded-xl font-bold hover:bg-[#00b300] transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {(isSubmitting || isPaymentLoading) ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                          <span>{isPaymentLoading ? 'Создание платежа...' : 'Отправка...'}</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          {freePostsRemaining > 0 ? 'Опубликовать' : `Оплатить и опубликовать (${DISPLAY_PRICE} ${CURRENCY})`}
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setCreateStep(2)}
                      className="w-full py-2.5 text-gray-500 text-sm hover:text-gray-700 transition-colors"
                    >
                      ← Назад
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Support Button */}
      <AiSupportButton />

      {/* Edit Project Modal */}
      {showEditModal && editingProject && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => {
            if (editStep === 1) {
              setShowEditModal(false);
              setEditingProject(null);
              setEditStep(1);
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
                <div className={`flex items-center gap-2 ${editStep >= 1 ? 'text-[#00CC00]' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    editStep >= 1 ? 'bg-[#00CC00] text-white' : 'bg-gray-200'
                  }`}>
                    1
                  </div>
                  <span className="text-sm font-medium hidden sm:block">Информация</span>
                </div>
                <div className={`h-0.5 flex-1 ${editStep >= 2 ? 'bg-[#00CC00]' : 'bg-gray-200'}`}></div>
                <div className={`flex items-center gap-2 ${editStep >= 2 ? 'text-[#00CC00]' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    editStep >= 2 ? 'bg-[#00CC00] text-white' : 'bg-gray-200'
                  }`}>
                    2
                  </div>
                  <span className="text-sm font-medium hidden sm:block">Задачи</span>
                </div>
                <div className={`h-0.5 flex-1 ${editStep >= 3 ? 'bg-[#00CC00]' : 'bg-gray-200'}`}></div>
                <div className={`flex items-center gap-2 ${editStep >= 3 ? 'text-[#00CC00]' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    editStep >= 3 ? 'bg-[#00CC00] text-white' : 'bg-gray-200'
                  }`}>
                    3
                  </div>
                  <span className="text-sm font-medium hidden sm:block">Отправка</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingProject(null);
                  setEditStep(1);
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
            {editStep === 1 && (
              <div className="max-h-[70vh] overflow-y-auto px-8 py-2">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Информация о проекте</h3>
              <div className="space-y-6">
                {/* Project Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Название проекта *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Например: Помощь детскому дому"
                    value={projectData.title}
                    onChange={(e) => setProjectData({ ...projectData, title: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00CC00] focus:border-[#00CC00]"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Категория проекта *
                  </label>
                  <CustomSelect
                    options={[
                      { value: '', label: 'Выберите категорию' },
                      ...categories.map((cat) => ({
                        value: cat.id,
                        label: cat.name
                      }))
                    ]}
                    value={projectData.category}
                    onChange={(value) => setProjectData({ ...projectData, category: value })}
                    placeholder="Выберите категорию"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Описание проекта *
                  </label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Опишите цели, задачи и ожидаемые результаты проекта..."
                    value={projectData.description}
                    onChange={(e) => setProjectData({ ...projectData, description: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00CC00] focus:border-[#00CC00] resize-none"
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Период проекта *
                  </label>
                  <DateRangePicker
                    startDate={projectData.startDate}
                    endDate={projectData.endDate}
                    onStartChange={(value) => setProjectData({ ...projectData, startDate: value })}
                    onEndChange={(value) => setProjectData({ ...projectData, endDate: value })}
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Локация *
                  </label>
                  <LocationPicker
                    value={projectData.location}
                    onChange={(location, lat, lon) => {
                      setProjectData({ 
                        ...projectData, 
                        location,
                        latitude: lat || null,
                        longitude: lon || null
                      });
                    }}
                    placeholder="Например: Бишкек, ул. Чуй 123"
                  />
                </div>

                {/* Max Volunteers */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Максимальное количество волонтёров *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Например: 10"
                    value={projectData.maxVolunteers}
                    onChange={(e) => setProjectData({ ...projectData, maxVolunteers: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00CC00] focus:border-[#00CC00]"
                  />
                </div>

                {/* Required Skills */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Требуемые навыки
                  </label>
                  <div className="flex gap-2 mb-3">
                    <CustomSelect
                      options={[
                        { value: '', label: 'Выберите навык' },
                        ...skills.map((skill) => ({
                          value: skill.name,
                          label: skill.name
                        }))
                      ]}
                      value=""
                      onChange={(value) => {
                        if (value) {
                          handleAddSkill(value);
                        }
                      }}
                      placeholder="Выберите навык"
                      className="flex-1"
                    />
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
                    onClick={handleUpdateProject}
                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    Сохранить как черновик
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStep(2)}
                    className="flex-1 px-6 py-3 bg-[#00CC00] text-white rounded-xl font-medium hover:bg-[#00b300] transition-colors"
                  >
                    Далее →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Tasks */}
            {editStep === 2 && (
              <div className="max-h-[70vh] overflow-y-auto px-8 py-2">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Задачи проекта</h3>
                <p className="text-gray-600 mb-4">Редактируйте существующие задачи или добавьте новые</p>

                {/* Индикатор распределения волонтёров */}
                {projectData.maxVolunteers && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-blue-900">
                        Распределение волонтёров
                      </span>
                      <span className="text-sm font-bold text-blue-900">
                        {tasks.reduce((sum, task) => sum + task.requiredVolunteers, 0)} / {projectData.maxVolunteers}
                      </span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all ${
                          tasks.reduce((sum, task) => sum + task.requiredVolunteers, 0) > parseInt(projectData.maxVolunteers)
                            ? 'bg-red-500'
                            : tasks.reduce((sum, task) => sum + task.requiredVolunteers, 0) === parseInt(projectData.maxVolunteers)
                            ? 'bg-green-500'
                            : 'bg-blue-500'
                        }`}
                        style={{ 
                          width: `${Math.min((tasks.reduce((sum, task) => sum + task.requiredVolunteers, 0) / parseInt(projectData.maxVolunteers)) * 100, 100)}%` 
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-blue-700 mt-2">
                      {tasks.reduce((sum, task) => sum + task.requiredVolunteers, 0) === parseInt(projectData.maxVolunteers)
                        ? '✓ Все волонтёры распределены'
                        : tasks.reduce((sum, task) => sum + task.requiredVolunteers, 0) > parseInt(projectData.maxVolunteers)
                        ? '⚠ Превышено максимальное количество волонтёров'
                        : `Осталось распределить: ${parseInt(projectData.maxVolunteers) - tasks.reduce((sum, task) => sum + task.requiredVolunteers, 0)} волонтёр(ов)`
                      }
                    </p>
                  </div>
                )}

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
                          <div className="flex gap-2 ml-4">
                            <Tooltip text="Редактировать">
                              <button
                                onClick={() => handleEditTask(task.id)}
                                className="text-blue-500 hover:text-blue-700"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            </Tooltip>
                            <Tooltip text="Удалить">
                              <button
                                onClick={() => handleRemoveTask(task.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </Tooltip>
                          </div>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Название задачи *
                      </label>
                      <input
                        type="text"
                        placeholder="Например: Уборка территории"
                        value={currentTask.title}
                        onChange={(e) => setCurrentTask({ ...currentTask, title: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00CC00] focus:border-[#00CC00]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Описание задачи *
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Опишите, что нужно сделать..."
                        value={currentTask.description}
                        onChange={(e) => setCurrentTask({ ...currentTask, description: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00CC00] focus:border-[#00CC00] resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Требуемый навык
                        </label>
                        <CustomSelect
                          options={[
                            { value: '', label: 'Не требуется' },
                            ...projectData.requiredSkills.map((skill) => ({
                              value: skill,
                              label: skill
                            }))
                          ]}
                          value={currentTask.requiredSkill}
                          onChange={(value) => setCurrentTask({ ...currentTask, requiredSkill: value })}
                          placeholder="Не требуется"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Количество волонтёров *
                        </label>
                        <input
                          type="number"
                          min="1"
                          placeholder="1"
                          value={currentTask.requiredVolunteers}
                          onChange={(e) => setCurrentTask({ ...currentTask, requiredVolunteers: e.target.value })}
                          className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00CC00] focus:border-[#00CC00]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Дедлайн
                        </label>
                        <CustomDatePicker
                          value={currentTask.deadline}
                          onChange={(value) => {
                            // Проверяем, что дата находится в диапазоне проекта
                            if (projectData.startDate && projectData.endDate) {
                              if (value < projectData.startDate || value > projectData.endDate) {
                                toast.error(`Дедлайн задачи должен быть между ${new Date(projectData.startDate).toLocaleDateString('ru-RU')} и ${new Date(projectData.endDate).toLocaleDateString('ru-RU')}`);
                                return;
                              }
                            }
                            setCurrentTask({ ...currentTask, deadline: value });
                          }}
                          placeholder="Выберите дедлайн"
                          minDate={projectData.startDate}
                          maxDate={projectData.endDate}
                        />
                        {projectData.startDate && projectData.endDate && (
                          <p className="text-xs text-gray-500 mt-1">
                            Период проекта: {new Date(projectData.startDate).toLocaleDateString('ru-RU')} - {new Date(projectData.endDate).toLocaleDateString('ru-RU')}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddTask}
                      className="w-full px-4 py-3 bg-[#00CC00] text-white rounded-xl font-medium hover:bg-[#00b300] transition-colors"
                    >
                      {currentTask.title && tasks.some(t => t.title === currentTask.title) ? 'Обновить задачу' : 'Добавить задачу'}
                    </button>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setEditStep(1)}
                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    ← Назад
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Проверяем, что все волонтёры распределены по задачам
                      const totalVolunteersInTasks = tasks.reduce((sum, task) => sum + task.requiredVolunteers, 0);
                      const maxVolunteers = parseInt(projectData.maxVolunteers) || 0;
                      
                      if (totalVolunteersInTasks !== maxVolunteers) {
                        if (totalVolunteersInTasks < maxVolunteers) {
                          toast.error(`Необходимо распределить всех волонтёров по задачам. Осталось: ${maxVolunteers - totalVolunteersInTasks}`);
                        } else {
                          toast.error(`Превышено максимальное количество волонтёров. Уменьшите на: ${totalVolunteersInTasks - maxVolunteers}`);
                        }
                        return;
                      }
                      
                      setEditStep(3);
                    }}
                    className="flex-1 px-6 py-3 bg-[#00CC00] text-white rounded-xl font-medium hover:bg-[#00b300] transition-colors"
                  >
                    Далее →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Submit */}
            {editStep === 3 && (
              <div className="max-h-[70vh] overflow-y-auto pr-2 pl-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Отправка на модерацию</h3>
                <p className="text-gray-600 mb-6">Проверьте информацию перед отправкой</p>

                {/* Summary */}
                <div className="space-y-4 mb-6">
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h4 className="font-bold text-gray-900 mb-2">Информация о проекте</h4>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-gray-600">Название:</span> <span className="font-medium">{projectData.title}</span></p>
                      <p><span className="text-gray-600">Локация:</span> <span className="font-medium">{projectData.location}</span></p>
                      <p><span className="text-gray-600">Волонтёры:</span> <span className="font-medium">{projectData.maxVolunteers}</span></p>
                      <p><span className="text-gray-600">Период:</span> <span className="font-medium">{new Date(projectData.startDate).toLocaleDateString('ru-RU')} - {new Date(projectData.endDate).toLocaleDateString('ru-RU')}</span></p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h4 className="font-bold text-gray-900 mb-2">Задачи ({tasks.length})</h4>
                    {tasks.length > 0 ? (
                      <ul className="space-y-1 text-sm">
                        {tasks.map((task, index) => (
                          <li key={task.id} className="text-gray-700">
                            {index + 1}. {task.title}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">Задачи не добавлены</p>
                    )}
                  </div>
                </div>

                {/* Info Box */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 mb-1">
                        Готово к отправке
                      </p>
                      <p className="text-sm text-blue-700">
                        После отправки проект будет проверен администратором в течение 1-3 дней.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setEditStep(2)}
                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    ← Назад
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await handleUpdateProject();
                      if (editingProject.status === 'draft') {
                        await handlePublishDraft(editingProject.id);
                      } else if (editingProject.status === 'rejected') {
                        await handleResubmitProject(editingProject.id);
                      }
                    }}
                    className="flex-1 px-6 py-3 bg-[#00CC00] text-white rounded-xl font-medium hover:bg-[#00b300] transition-colors"
                  >
                    Отправить на модерацию
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </SidebarProvider>
  );
}

export default function OrganizerProjects() {
  return (
    <Suspense fallback={null}>
      <OrganizerProjectsInner />
    </Suspense>
  );
}
