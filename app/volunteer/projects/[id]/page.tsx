'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import VolunteerNav from '../../components/VolunteerNav';
import VolunteerSidebar from '../../components/VolunteerSidebar';
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
  email: string;
  avatarUrl?: string;
  organizerProfile?: {
    organizationName: string;
    organizationDescription?: string;
  };
}

interface Skill {
  id: string;
  name: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  requiredVolunteers: number;
  deadline: string;
  status: string;
  requiredSkill?: Skill;
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

export default function ProjectDetail() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  
  const [user, setUser] = useState<User | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

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
        
        // Загружаем проект
        await loadProject();
      } catch (error) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, projectId]);

  const loadProject = async () => {
    try {
      const [projectRes, tasksRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/tasks`)
      ]);

      if (projectRes.ok) {
        const projectData = await projectRes.json();
        setProject(projectData.project);
      } else {
        router.push('/volunteer/projects');
      }

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData.tasks || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки проекта:', error);
      router.push('/volunteer/projects');
    }
  };

  const handleApply = async () => {
    if (!project) return;
    
    setApplying(true);
    try {
      // TODO: Реализовать API для подачи заявки на проект
      alert('Функция подачи заявки будет реализована в следующей версии');
    } catch (error) {
      console.error('Ошибка при подаче заявки:', error);
      alert('Произошла ошибка при подаче заявки');
    } finally {
      setApplying(false);
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

  if (!user || !project) {
    return null;
  }

  const startDate = new Date(project.startDate);
  const endDate = new Date(project.endDate);
  const spotsLeft = project.maxVolunteers - project.currentVolunteers;
  const isActive = endDate > new Date();

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50">
        <VolunteerSidebar user={user} />
        <VolunteerNav user={user} />

        <DynamicContent>
          {/* Header with back button */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 flex items-center justify-center rounded-full border-2 border-gray-300 hover:border-[#00CC00] hover:bg-[#00CC00] hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-gray-600">{project.category.name}</span>
                <span className="text-sm font-medium text-[#00CC00]">
                  {isActive && spotsLeft > 0 ? 'Набор открыт' : spotsLeft === 0 ? 'Мест нет' : 'Завершен'}
                </span>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
            {/* Project Image */}
            <div className="relative h-64 bg-gradient-to-br from-[#00CC00] to-emerald-600">
              {project.imageUrl ? (
                <img 
                  src={project.imageUrl} 
                  alt={project.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-20 h-20 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>

            <div className="p-6">
              {/* Organizer Info */}
              <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                    {project.organizer.avatarUrl ? (
                      <img src={project.organizer.avatarUrl} alt="Организатор" className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Организатор</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {project.organizer.organizerProfile?.organizationName || 
                       `${project.organizer.firstName} ${project.organizer.lastName}`}
                    </p>
                  </div>
                </div>
                <button className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
                  Написать
                </button>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h2 className="text-base font-bold text-gray-900 mb-3">Описание проекта</h2>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {project.description}
                  </p>
                </div>
              </div>

              {/* Date and Location */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 mb-2">Дата и время</h3>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="flex items-center gap-2 text-sm text-gray-900 mb-1">
                      <svg className="w-4 h-4 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium">Начало:</span>
                    </div>
                    <p className="text-sm text-gray-600 ml-6">
                      {startDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-900 mb-1 mt-2">
                      <svg className="w-4 h-4 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium">Окончание:</span>
                    </div>
                    <p className="text-sm text-gray-600 ml-6">
                      {endDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-gray-500 mb-2">Локация</h3>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-[#00CC00] mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="text-sm text-gray-900 font-medium">{project.location}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tasks */}
              {tasks.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-base font-bold text-gray-900 mb-3">Задачи проекта</h2>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 space-y-3">
                    {tasks.map((task) => (
                      <div key={task.id} className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-sm font-semibold text-gray-900">{task.title}</h3>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium whitespace-nowrap ml-2">
                            {task.requiredVolunteers} {task.requiredVolunteers === 1 ? 'человек' : 'человек'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{task.description}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          {task.requiredSkill && (
                            <div className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                              </svg>
                              <span>{task.requiredSkill.name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>До {new Date(task.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Required Skills */}
              {tasks.some(task => task.requiredSkill) && (
                <div className="mb-6">
                  <h2 className="text-base font-bold text-gray-900 mb-3">Требуемые навыки</h2>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(tasks.filter(task => task.requiredSkill).map(task => task.requiredSkill!.name))).map((skill) => (
                      <span key={skill} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                        #{skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Spots Available */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-gray-200">
                    <span className="text-xl font-bold text-[#00CC00]">{spotsLeft}</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Свободных мест</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {project.currentVolunteers} из {project.maxVolunteers} занято
                    </p>
                  </div>
                </div>
                {spotsLeft <= 5 && spotsLeft > 0 && (
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                    Осталось мало мест!
                  </span>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={handleApply}
                disabled={applying || !isActive || spotsLeft === 0}
                className={`w-full py-3 rounded-lg font-semibold text-base transition-colors ${
                  isActive && spotsLeft > 0
                    ? 'bg-[#00CC00] text-white hover:bg-[#00b300]'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {applying ? 'Отправка заявки...' : !isActive ? 'Проект завершен' : spotsLeft === 0 ? 'Мест нет' : 'Подать заявку'}
              </button>
            </div>
          </div>
        </DynamicContent>

        <AiSupportButton />
      </div>
    </SidebarProvider>
  );
}
