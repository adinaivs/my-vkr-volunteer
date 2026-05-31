'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import VolunteerNav from '../components/VolunteerNav';
import VolunteerSidebar from '../components/VolunteerSidebar';
import DynamicContent from '@/app/components/DynamicContent';
import { SidebarProvider } from '@/app/contexts/SidebarContext';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

interface SavedProject {
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
  savedAt: string;
  category: { id: string; slug: string; icon: string; name: string };
  organizer: {
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    organizationName: string | null;
  };
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft:      { label: 'Черновик',         color: 'bg-gray-100 text-gray-600' },
  moderation: { label: 'На модерации',     color: 'bg-yellow-100 text-yellow-700' },
  recruiting: { label: 'Набор волонтёров', color: 'bg-green-100 text-green-700' },
  upcoming:   { label: 'Скоро начнётся',   color: 'bg-blue-100 text-blue-700' },
  active:     { label: 'Идёт сейчас',      color: 'bg-purple-100 text-purple-700' },
  completed:  { label: 'Завершён',          color: 'bg-gray-100 text-gray-500' },
  cancelled:  { label: 'Отменён',           color: 'bg-red-100 text-red-600' },
  blocked:    { label: 'Заблокирован',      color: 'bg-red-100 text-red-700' },
};

export default function SavedProjectsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) { router.push('/login'); return; }
        const meData = await meRes.json();
        if (meData.user?.role !== 'volunteer') { router.push('/login'); return; }
        setUser(meData.user);

        const res = await fetch('/api/volunteer/saved-projects?locale=ru');
        if (res.ok) {
          const data = await res.json();
          setProjects(data.projects || []);
        }
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleRemove = async (projectId: string) => {
    setRemovingId(projectId);
    try {
      const res = await fetch(`/api/volunteer/saved-projects/${projectId}`, { method: 'DELETE' });
      if (res.ok) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
      }
    } catch {}
    setRemovingId(null);
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });

  if (loading) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00]" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50">
        <VolunteerSidebar user={user} />
        <VolunteerNav user={user} />

        <DynamicContent>
          {/* Заголовок */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-xs font-medium">Назад</span>
            </button>
            <div className="w-px h-4 bg-gray-300" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Сохранённые проекты</h1>
            {projects.length > 0 && (
              <span className="px-2.5 py-0.5 bg-[#00CC00]/10 text-[#00CC00] rounded-full text-xs font-semibold">
                {projects.length}
              </span>
            )}
          </div>

          {/* Пусто */}
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 bg-white rounded-full border border-gray-200 flex items-center justify-center mb-5 shadow-sm">
                <svg className="w-9 h-9 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-gray-800 mb-2">Нет сохранённых проектов</h2>
              <p className="text-sm text-gray-500 mb-6 max-w-xs">
                Нажмите на иконку закладки на странице проекта, чтобы сохранить его здесь
              </p>
              <Link
                href="/volunteer/projects"
                className="px-5 py-2.5 bg-[#00CC00] text-white rounded-xl text-sm font-medium hover:bg-[#00b300] transition-colors"
              >
                Смотреть проекты
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {projects.map((project) => {
                const st = STATUS_LABELS[project.status];
                const spotsLeft = project.maxVolunteers - project.currentVolunteers;
                const pct = Math.min(100, Math.round((project.currentVolunteers / project.maxVolunteers) * 100));
                const isRemoving = removingId === project.id;

                return (
                  <div
                    key={project.id}
                    className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col transition-opacity ${isRemoving ? 'opacity-50' : ''}`}
                  >
                    {/* Изображение */}
                    <Link href={`/volunteer/projects/${project.id}`} className="block">
                      <div className="relative h-40 bg-gradient-to-br from-[#00CC00] to-emerald-500">
                        {project.imageUrl ? (
                          <img src={project.imageUrl} alt={project.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-4xl opacity-50">{project.category.icon}</span>
                          </div>
                        )}
                        {st && (
                          <span className={`absolute top-2 left-2 text-[11px] font-medium px-2 py-0.5 rounded-full ${st.color}`}>
                            {st.label}
                          </span>
                        )}
                      </div>
                    </Link>

                    {/* Контент */}
                    <div className="p-4 flex flex-col flex-1">
                      <Link href={`/volunteer/projects/${project.id}`}>
                        <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1 hover:text-[#00CC00] transition-colors line-clamp-2">
                          {project.title}
                        </h3>
                      </Link>

                      <p className="text-xs text-gray-400 mb-3">{project.category.name}</p>

                      {/* Мета */}
                      <div className="space-y-1.5 mb-3">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="truncate">{project.location}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{fmt(project.startDate)} — {fmt(project.endDate)}</span>
                        </div>
                      </div>

                      {/* Прогресс волонтёров */}
                      <div className="mb-3">
                        <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                          <span>Волонтёры</span>
                          <span className="font-medium text-gray-700">{project.currentVolunteers}/{project.maxVolunteers}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#00CC00] rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        {project.status === 'recruiting' && spotsLeft > 0 && (
                          <p className="text-[11px] text-green-600 mt-0.5">Осталось {spotsLeft} мест</p>
                        )}
                      </div>

                      {/* Подвал: организатор + удалить */}
                      <div className="mt-auto flex items-center justify-between pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-2 min-w-0">
                          {project.organizer.avatarUrl ? (
                            <img src={project.organizer.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-[#00CC00] flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                              {project.organizer.firstName[0]}{project.organizer.lastName[0]}
                            </div>
                          )}
                          <span className="text-[11px] text-gray-500 truncate">
                            {project.organizer.organizationName || `${project.organizer.firstName} ${project.organizer.lastName}`}
                          </span>
                        </div>

                        <button
                          onClick={() => handleRemove(project.id)}
                          disabled={isRemoving}
                          title="Убрать из сохранённых"
                          className="flex-shrink-0 ml-2 w-7 h-7 flex items-center justify-center rounded-lg text-[#00CC00] hover:bg-red-50 hover:text-red-500 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DynamicContent>
      </div>
    </SidebarProvider>
  );
}
