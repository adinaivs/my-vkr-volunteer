'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminSidebar from '../components/AdminSidebar';
import AdminNav from '../components/AdminNav';
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

interface Statistics {
  totalUsers: number;
  totalVolunteers: number;
  totalOrganizers: number;
  activeProjects: number;
  pendingVerifications: number;
  pendingOrganizerApprovals: number;
}

interface ActivityItem {
  type: string;
  date: string;
  data: any;
}

const ACTIVITY_ICONS: Record<string, { icon: string; color: string; label: (d: any) => string }> = {
  new_user: {
    icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
    color: 'bg-blue-100 text-blue-600',
    label: (d) => `Новый ${d.role === 'volunteer' ? 'волонтёр' : 'организатор'}: ${d.firstName} ${d.lastName}`,
  },
  project_moderation: {
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    color: 'bg-yellow-100 text-yellow-600',
    label: (d) => `Проект на модерации: «${d.title}»`,
  },
  project_moderated: {
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    color: 'bg-green-100 text-green-600',
    label: (d) => `Проект ${d.status === 'recruiting' ? 'одобрен' : 'отклонён'}: «${d.title}»`,
  },
  org_approved: {
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    color: 'bg-emerald-100 text-emerald-600',
    label: (d) => `Организатор подтверждён: ${d.user?.firstName} ${d.user?.lastName}`,
  },
  org_rejected: {
    icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
    color: 'bg-red-100 text-red-600',
    label: (d) => `Организатор отклонён: ${d.user?.firstName} ${d.user?.lastName}`,
  },
};

const PROJECT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Черновики', color: 'bg-gray-400' },
  moderation: { label: 'На модерации', color: 'bg-yellow-400' },
  rejected: { label: 'Отклонённые', color: 'bg-red-400' },
  recruiting: { label: 'Набор', color: 'bg-blue-400' },
  upcoming: { label: 'Скоро', color: 'bg-purple-400' },
  active: { label: 'Активные', color: 'bg-green-500' },
  completed: { label: 'Завершённые', color: 'bg-emerald-500' },
  cancelled: { label: 'Отменённые', color: 'bg-orange-400' },
  blocked: { label: 'Заблокированные', color: 'bg-red-600' },
};

function MiniBar({ data, maxVal, color = 'bg-[#00CC00]' }: { data: { label: string; count: number }[]; maxVal: number; color?: string }) {
  return (
    <div className="space-y-1.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-10 text-right shrink-0">{d.label}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
            <div
              className={`h-full ${color} rounded-full flex items-center justify-end pr-1.5 transition-all`}
              style={{ width: maxVal > 0 ? `${Math.max((d.count / maxVal) * 100, d.count > 0 ? 5 : 0)}%` : '0%' }}
            >
              {d.count > 0 && <span className="text-xs font-bold text-white leading-none">{d.count}</span>}
            </div>
          </div>
          {d.count === 0 && <span className="text-xs text-gray-300">0</span>}
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<Statistics>({
    totalUsers: 0, totalVolunteers: 0, totalOrganizers: 0,
    activeProjects: 0, pendingVerifications: 0, pendingOrganizerApprovals: 0,
  });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) { router.push('/admin/login'); return; }
        const data = await meRes.json();
        if (data.user.role !== 'admin') { router.push('/'); return; }
        setUser(data.user);

        const [statsRes, activityRes, analyticsRes] = await Promise.all([
          fetch('/api/admin/statistics'),
          fetch('/api/admin/activity'),
          fetch('/api/admin/analytics'),
        ]);

        if (statsRes.ok) setStatistics(await statsRes.json());
        if (activityRes.ok) setActivity((await activityRes.json()).activity);
        if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00]" />
      </div>
    );
  }

  const stats = [
    { label: 'Всего пользователей', value: statistics.totalUsers, color: 'bg-blue-100 text-blue-600', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { label: 'Волонтёров', value: statistics.totalVolunteers, color: 'bg-green-100 text-green-600', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { label: 'Организаторов', value: statistics.totalOrganizers, color: 'bg-purple-100 text-purple-600', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { label: 'Активных проектов', value: statistics.activeProjects, color: 'bg-[#00CC00]/10 text-[#00CC00]', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { label: 'Ожидают проверки', value: statistics.pendingOrganizerApprovals, color: 'bg-orange-100 text-orange-600', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  ];

  const quickActions = [
    { href: '/admin/users', label: 'Пользователи', desc: 'Блокировка и управление', color: 'bg-blue-100 text-blue-600', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { href: '/admin/organizers', label: 'Организаторы', desc: 'Верификация заявок', color: 'bg-orange-100 text-orange-600', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { href: '/admin/projects', label: 'Проекты', desc: 'Модерация проектов', color: 'bg-[#00CC00]/10 text-[#00CC00]', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { href: '/admin/settings', label: 'Настройки', desc: 'Системные параметры', color: 'bg-gray-100 text-gray-600', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
  ];

  const maxReg = analytics ? Math.max(...(analytics.monthlyRegistrations?.map((d: any) => d.count) || [1]), 1) : 1;
  const maxProj = analytics ? Math.max(...(analytics.monthlyProjects?.map((d: any) => d.count) || [1]), 1) : 1;
  const totalProjectsAll = analytics?.projectsByStatus?.reduce((s: number, p: any) => s + p.count, 0) || 1;

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50">
        {user && <><AdminNav user={user} /><AdminSidebar user={user} /></>}

        <DynamicContent>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Добро пожаловать, {user?.firstName}!</h1>
            <p className="text-gray-500 mt-1 text-sm">Панель администратора</p>
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {stats.map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center mb-3`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} />
                  </svg>
                </div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Быстрые действия */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Быстрые действия</h2>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((a) => (
                  <Link key={a.href} href={a.href}
                    className="bg-white rounded-2xl border border-gray-200 p-4 hover:border-[#00CC00] hover:shadow-md transition-all">
                    <div className={`w-10 h-10 ${a.color} rounded-xl flex items-center justify-center mb-3`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={a.icon} />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{a.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{a.desc}</p>
                  </Link>
                ))}
              </div>
            </div>

            {/* Лента активности */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Последняя активность</h2>
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {activity.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">Нет активности</div>
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {activity.map((item, i) => {
                      const cfg = ACTIVITY_ICONS[item.type];
                      if (!cfg) return null;
                      return (
                        <li key={i} className="flex items-start gap-3 px-4 py-3">
                          <div className={`w-8 h-8 ${cfg.color} rounded-lg flex items-center justify-center shrink-0 mt-0.5`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={cfg.icon} />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 truncate">{cfg.label(item.data)}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(item.date).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Аналитика */}
          {analytics && (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Аналитика</h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
                {/* Регистрации по месяцам */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Регистрации (6 мес.)</p>
                  <MiniBar data={analytics.monthlyRegistrations} maxVal={maxReg} color="bg-[#00CC00]" />
                </div>

                {/* Проекты по месяцам */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Новые проекты (6 мес.)</p>
                  <MiniBar data={analytics.monthlyProjects} maxVal={maxProj} color="bg-blue-500" />
                </div>

                {/* Проекты по статусам */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Проекты по статусам</p>
                  <div className="space-y-1.5">
                    {analytics.projectsByStatus?.map((p: any) => {
                      const st = PROJECT_STATUS_LABELS[p.status] || { label: p.status, color: 'bg-gray-400' };
                      const pct = totalProjectsAll > 0 ? (p.count / totalProjectsAll) * 100 : 0;
                      return (
                        <div key={p.status} className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 w-24 shrink-0 truncate">{st.label}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                            <div className={`h-full ${st.color} rounded-full`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-medium text-gray-600 w-5 text-right">{p.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Топ волонтёров */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-700">Топ волонтёров</p>
                  </div>
                  {analytics.topVolunteers?.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-sm">Нет данных</div>
                  ) : (
                    <ul className="divide-y divide-gray-50">
                      {analytics.topVolunteers?.slice(0, 5).map((v: any, i: number) => (
                        <li key={v.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 transition-colors">
                          <span className={`text-sm font-bold w-5 text-center ${i < 3 ? 'text-amber-500' : 'text-gray-300'}`}>{i + 1}</span>
                          <div className="w-7 h-7 rounded-full overflow-hidden shrink-0">
                            {v.avatarUrl ? <img src={v.avatarUrl} alt="" className="w-full h-full object-cover" /> :
                              <div className="w-full h-full bg-[#00CC00] flex items-center justify-center text-white text-xs font-bold">{v.firstName[0]}{v.lastName[0]}</div>}
                          </div>
                          <Link href={`/admin/users/${v.id}`} className="flex-1 text-sm text-gray-800 hover:text-[#00CC00] truncate">
                            {v.firstName} {v.lastName}
                          </Link>
                          <span className="text-xs text-gray-500 shrink-0">{v.completedTasks} задач</span>
                          <span className="text-xs font-bold text-[#00CC00] shrink-0">{Number(v.trustScore).toFixed(1)}★</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Топ организаторов */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-700">Топ организаторов</p>
                  </div>
                  {analytics.topOrganizers?.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-sm">Нет данных</div>
                  ) : (
                    <ul className="divide-y divide-gray-50">
                      {analytics.topOrganizers?.slice(0, 5).map((o: any, i: number) => (
                        <li key={o.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 transition-colors">
                          <span className={`text-sm font-bold w-5 text-center ${i < 3 ? 'text-amber-500' : 'text-gray-300'}`}>{i + 1}</span>
                          <div className="w-7 h-7 rounded-full overflow-hidden shrink-0">
                            {o.avatarUrl ? <img src={o.avatarUrl} alt="" className="w-full h-full object-cover" /> :
                              <div className="w-full h-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold">{o.firstName[0]}{o.lastName[0]}</div>}
                          </div>
                          <Link href={`/admin/users/${o.id}`} className="flex-1 text-sm text-gray-800 hover:text-[#00CC00] truncate">
                            {o.firstName} {o.lastName}
                          </Link>
                          <span className="text-xs text-gray-500 shrink-0">{o.organizationName || o.city}</span>
                          <span className="text-xs font-bold text-gray-700 shrink-0">{o.projectsCount} проектов</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}
        </DynamicContent>
      </div>
    </SidebarProvider>
  );
}
