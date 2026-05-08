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
  email: string;
  firstName: string;
  lastName: string;
  role: string;
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
  organizerProfile?: {
    organizationName: string;
  };
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
  category: Category;
  organizer: Organizer;
}

export default function VolunteerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [recommendedProjects, setRecommendedProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

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
        
        // Загружаем рекомендуемые проекты
        await loadRecommendedProjects();
      } catch (error) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const loadRecommendedProjects = async () => {
    try {
      const response = await fetch('/api/projects?status=recruiting');
      if (response.ok) {
        const data = await response.json();
        // Фильтруем активные проекты и берем первые 3
        const activeProjects = data.projects
          .filter((project: Project) => {
            const endDate = new Date(project.endDate);
            return endDate > new Date();
          })
          .slice(0, 3);
        setRecommendedProjects(activeProjects);
      }
    } catch (error) {
      console.error('Ошибка загрузки проектов:', error);
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

        {/* Main Content */}
        <DynamicContent>
        {/* Hero Banner */}
        <section className="bg-gradient-to-r from-[#00CC00] to-emerald-500 rounded-2xl p-8 md:p-10 text-white mb-8 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute left-0 bottom-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative z-10">
            <h1 className="text-xl md:text-2xl font-bold mb-3">
              Добро пожаловать, {user?.firstName}! 👋
            </h1>
            <p className="text-sm md:text-base text-emerald-50 mb-5 mt-4 max-w-2xl">
              Готовы изменить мир к лучшему? Найдите проект, который вам по душе, и начните помогать уже сегодня!
            </p>
            <Link 
              href="/volunteer/projects"
              className="inline-block px-5 py-2 bg-white text-[#00CC00] rounded-full text-sm font-semibold hover:bg-emerald-50 transition-colors"
            >
              Найти проект
            </Link>
          </div>
        </section>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">0</div>
                <div className="text-xs text-gray-600">Активных проектов</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">0</div>
                <div className="text-xs text-gray-600">Завершено проектов</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">0</div>
                <div className="text-xs text-gray-600">Часов волонтёрства</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">0</div>
                <div className="text-xs text-gray-600">Достижений</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recommended Projects */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Рекомендуемые проекты</h2>
            <Link href="/volunteer/projects" className="text-[#00CC00] font-medium hover:underline">
              Смотреть все
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recommendedProjects.length > 0 ? (
              recommendedProjects.map((project) => {
                const spotsLeft = project.maxVolunteers - project.currentVolunteers;
                const startDate = new Date(project.startDate);
                
                return (
                  <div key={project.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative h-32 bg-gradient-to-br from-[#00CC00] to-emerald-600">
                      {project.imageUrl ? (
                        <img 
                          src={project.imageUrl} 
                          alt={project.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-10 h-10 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <span className="px-2 py-0.5 bg-white/90 backdrop-blur-sm text-gray-900 rounded-full text-xs font-medium">
                          {project.category.name}
                        </span>
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-bold text-sm text-gray-900 mb-1.5 line-clamp-2">{project.title}</h3>
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">{project.description}</p>
                      
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        <span>{project.location}</span>
                      </div>
                      
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
                        <span className="text-xs text-gray-600">
                          {project.currentVolunteers}/{project.maxVolunteers}
                        </span>
                        {spotsLeft <= 5 && spotsLeft > 0 && (
                          <span className="text-xs text-orange-600 font-medium">
                            {spotsLeft} мест
                          </span>
                        )}
                      </div>
                      
                      <Link
                        href={`/volunteer/projects/${project.id}`}
                        className="block w-full text-center px-3 py-1.5 bg-[#00CC00] text-white rounded-lg text-xs font-medium hover:bg-[#00b300] transition-colors"
                      >
                        Подробнее
                      </Link>
                    </div>
                  </div>
                );
              })
            ) : (
              /* Empty State */
              <div className="col-span-3 bg-white rounded-xl p-8 text-center border border-gray-100">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">Проекты скоро появятся</h3>
                <p className="text-sm text-gray-600 mb-3">Пока нет доступных проектов. Загляните позже!</p>
                <Link 
                  href="/volunteer/projects"
                  className="inline-block px-5 py-2 text-sm bg-[#00CC00] text-white rounded-full font-medium hover:bg-[#00b300] transition-colors"
                >
                  Перейти в каталог
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Current Projects */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Текущие проекты</h2>
            <Link href="/volunteer/my-projects" className="text-[#00CC00] font-medium hover:underline">
              Смотреть все
            </Link>
          </div>

          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">У вас пока нет активных проектов</h3>
            <p className="text-gray-600 mb-4">Найдите интересный проект и подайте заявку на участие</p>
            <Link 
              href="/volunteer/projects"
              className="inline-block px-6 py-2 bg-[#00CC00] text-white rounded-full font-medium hover:bg-[#00b300] transition-colors"
            >
              Найти проект
            </Link>
          </div>
        </section>
      </DynamicContent>

      {/* AI Support Button */}
      <AiSupportButton />
    </div>
    </SidebarProvider>
  );
}
