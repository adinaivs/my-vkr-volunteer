'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import VolunteerNav from '../components/VolunteerNav';
import VolunteerSidebar from '../components/VolunteerSidebar';
import AiSupportButton from '@/app/components/AiSupportButton';
import DynamicContent from '@/app/components/DynamicContent';
import { SidebarProvider } from '@/app/contexts/SidebarContext';
import { useTranslation } from '@/app/i18n/useTranslation';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatarUrl?: string;
}

interface Stats {
  activeProjects: number;
  completedProjects: number;
  completedTasks: number;
  achievementsCount: number;
  trustScore: number;
  ratingCount: number;
  pendingApplications: number;
  currentProjects: CurrentProject[];
}

interface CurrentProject {
  id: string;
  title: string;
  status: string;
  startDate: string;
  endDate: string;
  location: string;
  imageUrl?: string | null;
  categoryName: string;
  myTasksTotal: number;
  myTasksDone: number;
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
  category: { name: string };
  organizer: { firstName: string; lastName: string; organizerProfile?: { organizationName: string } };
}

const PROJECT_STATUS: Record<string, { label: string; cls: string }> = {
  recruiting: { label: 'Набор',    cls: 'bg-blue-100 text-blue-700' },
  upcoming:   { label: 'Скоро',    cls: 'bg-purple-100 text-purple-700' },
  active:     { label: 'Активный', cls: 'bg-green-100 text-green-700' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function VolunteerDashboard() {
  const router = useRouter();
  const { t } = useTranslation('volunteer');
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recommended, setRecommended] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) { router.push('/login'); return; }
        const data = await res.json();
        if (data.user.role !== 'volunteer') { router.push('/dashboard'); return; }
        setUser(data.user);

        const [statsRes, projRes] = await Promise.all([
          fetch('/api/volunteer/stats'),
          fetch('/api/projects?status=recruiting'),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (projRes.ok) {
          const pd = await projRes.json();
          setRecommended(
            (pd.projects as Project[])
              .filter(p => new Date(p.endDate) > new Date())
              .slice(0, 3)
          );
        }
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00] mx-auto" />
          <p className="mt-4 text-gray-600">{t.common?.loading || 'Загрузка...'}</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const hasCurrentProjects = (stats?.currentProjects.length ?? 0) > 0;

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50">
        <VolunteerSidebar user={user} />
        <VolunteerNav user={user} />

        <DynamicContent>
          {/* Hero */}
          <section className="bg-gradient-to-r from-[#00CC00] to-emerald-500 rounded-2xl p-8 md:p-10 text-white mb-8 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/3 translate-x-1/3 pointer-events-none" />
            <div className="absolute left-0 bottom-0 w-36 h-36 bg-white/10 rounded-full translate-y-1/3 -translate-x-1/3 pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <p className="text-emerald-100 text-sm font-medium mb-1">{t.dashboard?.personalAccount || 'Личный кабинет'}</p>
                <h1 className="text-2xl md:text-3xl font-bold mb-3">
                  {t.dashboard?.welcome || 'Добро пожаловать,'} {user.firstName}!
                </h1>
                <p className="text-emerald-50 text-sm max-w-lg">
                  {t.dashboard?.subtitle || 'Готовы изменить мир к лучшему? Найдите проект по душе и начните помогать уже сегодня.'}
                </p>
                {stats && stats.pendingApplications > 0 && (
                  <div className="mt-3 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 text-sm">
                    <span className="w-2 h-2 rounded-full bg-yellow-300 animate-pulse" />
                    {stats.pendingApplications} заявка на рассмотрении
                  </div>
                )}
              </div>
              <div className="flex gap-3 flex-wrap sm:flex-nowrap">
                <Link
                  href="/volunteer/projects"
                  className="px-5 py-2.5 bg-white text-[#00CC00] rounded-full text-sm font-semibold hover:bg-emerald-50 transition-colors whitespace-nowrap"
                >
                  {t.common?.findProject || 'Найти проект'}
                </Link>
                <Link
                  href="/volunteer/my-projects"
                  className="px-5 py-2.5 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-semibold hover:bg-white/30 transition-colors whitespace-nowrap border border-white/30"
                >
                  {t.nav?.myProjects || 'Мои проекты'}
                </Link>
              </div>
            </div>
          </section>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              value={stats?.activeProjects ?? 0}
              label={t.dashboard?.activeProjects || 'Активных проектов'}
              iconPath="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              iconBg="bg-blue-100" iconColor="text-blue-600"
            />
            <StatCard
              value={stats?.completedProjects ?? 0}
              label={t.dashboard?.completedProjects || 'Завершено проектов'}
              iconPath="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              iconBg="bg-green-100" iconColor="text-green-600"
            />
            <StatCard
              value={stats?.completedTasks ?? 0}
              label={t.dashboard?.completedTasks || 'Выполнено задач'}
              iconPath="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              iconBg="bg-purple-100" iconColor="text-purple-600"
            />
            <StatCard
              value={stats?.achievementsCount ?? 0}
              label={t.dashboard?.achievements || 'Достижений'}
              iconPath="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
              iconBg="bg-yellow-100" iconColor="text-yellow-600"
            />
          </div>

          {/* Rating bar (shown only if has ratings) */}
          {stats && stats.ratingCount > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-8 flex items-center gap-5">
              <div className="text-center shrink-0">
                <div className="text-4xl font-bold text-gray-900">{stats.trustScore.toFixed(1)}</div>
                <div className="text-xs text-gray-500 mt-0.5">из 5.0</div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <svg key={s} className={`w-5 h-5 ${stats.trustScore >= s ? 'text-yellow-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                  <span className="text-sm text-gray-500 ml-1">{stats.ratingCount} {t.dashboard?.ratings || 'оценок'}</span>
                </div>
                <p className="text-sm text-gray-500">{t.dashboard?.reliabilityRating || 'Ваш рейтинг надёжности — формируется по оценкам организаторов'}</p>
              </div>
              <Link href="/volunteer/profile" className="shrink-0 text-sm text-[#00CC00] font-medium hover:underline">
                {t.dashboard?.profileLink || 'Профиль →'}
              </Link>
            </div>
          )}

          {/* Current Projects */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900">{t.dashboard?.currentProjects || 'Мои текущие проекты'}</h2>
              <Link href="/volunteer/my-projects" className="text-sm text-[#00CC00] font-medium hover:underline">
                {t.common?.viewAll || 'Все проекты'}
              </Link>
            </div>

            {hasCurrentProjects ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stats!.currentProjects.map(project => {
                  const statusInfo = PROJECT_STATUS[project.status] ?? { label: project.status, cls: 'bg-gray-100 text-gray-600' };
                  const pct = project.myTasksTotal > 0
                    ? Math.round((project.myTasksDone / project.myTasksTotal) * 100)
                    : null;
                  return (
                    <Link
                      key={project.id}
                      href={`/volunteer/my-projects`}
                      className="bg-white rounded-2xl border border-gray-200 hover:shadow-md transition-shadow overflow-hidden group"
                    >
                      <div className="h-28 bg-gradient-to-br from-[#00CC00] to-emerald-500 relative">
                        {project.imageUrl && (
                          <img src={project.imageUrl} alt={project.title} className="w-full h-full object-cover" />
                        )}
                        <div className="absolute top-3 left-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusInfo.cls}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2 group-hover:text-[#00CC00] transition-colors">
                          {project.title}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatDate(project.startDate)} — {formatDate(project.endDate)}
                        </div>
                        {pct !== null && (
                          <div>
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>Задачи</span>
                              <span>{project.myTasksDone}/{project.myTasksTotal}</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-1.5 bg-[#00CC00] rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-10 text-center border border-gray-100">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm mb-4">{t.dashboard?.noActiveProjects || 'У вас пока нет активных проектов'}</p>
                <Link
                  href="/volunteer/projects"
                  className="inline-block px-5 py-2 bg-[#00CC00] text-white rounded-full text-sm font-medium hover:bg-[#00b300] transition-colors"
                >
                  {t.common?.findProject || 'Найти проект'}
                </Link>
              </div>
            )}
          </section>

          {/* Recommended Projects */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900">{t.dashboard?.recommended || 'Рекомендуемые проекты'}</h2>
              <Link href="/volunteer/projects" className="text-sm text-[#00CC00] font-medium hover:underline">
                {t.common?.viewAll || 'Все проекты'}
              </Link>
            </div>

            {recommended.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {recommended.map(project => {
                  const spotsLeft = project.maxVolunteers - project.currentVolunteers;
                  return (
                    <div key={project.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                      <div className="relative h-36 bg-gradient-to-br from-[#00CC00] to-emerald-500">
                        {project.imageUrl && (
                          <img src={project.imageUrl} alt={project.title} className="w-full h-full object-cover" />
                        )}
                        <div className="absolute top-3 left-3">
                          <span className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-800">
                            {project.category.name}
                          </span>
                        </div>
                        {spotsLeft <= 5 && spotsLeft > 0 && (
                          <div className="absolute top-3 right-3">
                            <span className="px-2 py-1 bg-orange-500 rounded-full text-xs font-medium text-white">
                              Осталось {spotsLeft}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-4 flex flex-col flex-1">
                        <h3 className="font-bold text-gray-900 text-sm mb-1.5 line-clamp-2">{project.title}</h3>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-3 flex-1">{project.description}</p>
                        <div className="space-y-1.5 mb-4">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            {project.location}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {formatDate(project.startDate)}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" />
                            </svg>
                            {project.currentVolunteers} / {project.maxVolunteers} волонтёров
                          </div>
                        </div>
                        <Link
                          href={`/volunteer/projects/${project.id}`}
                          className="block w-full text-center px-4 py-2 bg-[#00CC00] text-white rounded-xl text-sm font-medium hover:bg-[#00b300] transition-colors"
                        >
                          Подробнее
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-10 text-center border border-gray-100">
                <p className="text-gray-500 text-sm mb-4">{t.dashboard?.noRecommended || 'Нет доступных проектов. Загляните позже!'}</p>
                <Link
                  href="/volunteer/projects"
                  className="inline-block px-5 py-2 bg-[#00CC00] text-white rounded-full text-sm font-medium hover:bg-[#00b300] transition-colors"
                >
                  {t.dashboard?.goToCatalog || 'Перейти в каталог'}
                </Link>
              </div>
            )}
          </section>

          {/* Quick actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/volunteer/projects" className="bg-gradient-to-br from-[#00CC00] to-emerald-500 rounded-2xl p-5 text-white hover:shadow-lg transition-shadow group">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h4 className="font-bold mb-1">{t.dashboard?.projectCatalog || 'Каталог проектов'}</h4>
              <p className="text-sm text-emerald-50">{t.dashboard?.findSuitable || 'Найдите подходящий проект'}</p>
            </Link>

            <Link href="/volunteer/achievements" className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow group">
              <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h4 className="font-bold text-gray-900 mb-1">{t.dashboard?.myAchievements || 'Мои достижения'}</h4>
              <p className="text-sm text-gray-500">{t.dashboard?.viewAwards || 'Просмотр наград и бонусов'}</p>
            </Link>

            <Link href="/volunteer/profile" className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow group">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h4 className="font-bold text-gray-900 mb-1">{t.dashboard?.myProfile || 'Мой профиль'}</h4>
              <p className="text-sm text-gray-500">{t.dashboard?.skillsRating || 'Навыки, рейтинг, настройки'}</p>
            </Link>
          </div>
        </DynamicContent>

        <AiSupportButton />
      </div>
    </SidebarProvider>
  );
}

function StatCard({
  value, label, iconPath, iconBg, iconColor,
}: {
  value: number;
  label: string;
  iconPath: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
      <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center shrink-0`}>
        <svg className={`w-5 h-5 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
        </svg>
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  );
}
