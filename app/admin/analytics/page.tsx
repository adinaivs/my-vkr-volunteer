'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminNav from '../components/AdminNav';
import AdminSidebar from '../components/AdminSidebar';
import DynamicContent from '@/app/components/DynamicContent';
import { SidebarProvider } from '@/app/contexts/SidebarContext';
import { useTranslation } from '@/app/i18n/useTranslation';

interface AdminUser { id: string; firstName: string; lastName: string; email: string; role: string; avatarUrl?: string; }

function BarChart({ data, maxVal, color = 'bg-[#00CC00]' }: { data: { label: string; count: number }[]; maxVal: number; color?: string }) {
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-14 text-right shrink-0">{d.label}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
            <div
              className={`h-full ${color} rounded-full flex items-center justify-end pr-2 transition-all duration-500`}
              style={{ width: maxVal > 0 ? `${Math.max((d.count / maxVal) * 100, d.count > 0 ? 4 : 0)}%` : '0%' }}
            >
              {d.count > 0 && <span className="text-xs font-bold text-white">{d.count}</span>}
            </div>
          </div>
          {d.count === 0 && <span className="text-xs text-gray-400">0</span>}
        </div>
      ))}
    </div>
  );
}

function HorizontalBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-36 shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-700 w-8 text-right">{count}</span>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const { t } = useTranslation('admin');
  const [me, setMe] = useState<AdminUser | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) { router.push('/admin/login'); return; }
        const { user } = await meRes.json();
        if (user.role !== 'admin') { router.push('/'); return; }
        setMe(user);
        const res = await fetch('/api/admin/analytics');
        if (res.ok) setData((await res.json()));
      } finally { setLoading(false); }
    };
    init();
  }, [router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00]" />
    </div>
  );

  if (!data) return null;

  const { totals, projectsByStatus, monthlyRegistrations, monthlyProjects, topVolunteers, topOrganizers, categoriesWithCount } = data;
  const maxReg = Math.max(...(monthlyRegistrations?.map((d: any) => d.count) || [1]), 1);
  const maxProj = Math.max(...(monthlyProjects?.map((d: any) => d.count) || [1]), 1);
  const totalProjectsAll = projectsByStatus?.reduce((s: number, p: any) => s + p.count, 0) || 1;

  const PROJECT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
    draft: { label: t.analytics?.projectStatusDraft || 'Черновики', color: 'bg-gray-400' },
    moderation: { label: t.analytics?.projectStatusModeration || 'На модерации', color: 'bg-yellow-400' },
    rejected: { label: t.analytics?.projectStatusRejected || 'Отклонённые', color: 'bg-red-400' },
    recruiting: { label: t.analytics?.projectStatusRecruiting || 'Набор', color: 'bg-blue-400' },
    upcoming: { label: t.analytics?.projectStatusUpcoming || 'Скоро', color: 'bg-purple-400' },
    active: { label: t.analytics?.projectStatusActive || 'Активные', color: 'bg-green-500' },
    completed: { label: t.analytics?.projectStatusCompleted || 'Завершённые', color: 'bg-emerald-500' },
    cancelled: { label: t.analytics?.projectStatusCancelled || 'Отменённые', color: 'bg-orange-400' },
    blocked: { label: t.analytics?.projectStatusBlocked || 'Заблокированные', color: 'bg-red-600' },
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50">
        {me && <><AdminNav user={me} /><AdminSidebar user={me} /></>}
        <DynamicContent>
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">{t.analytics?.title || 'Аналитика'}</h1>
            <p className="text-gray-500 mt-1 text-sm">{t.analytics?.subtitle || 'Статистика платформы'}</p>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: t.analytics?.totalUsers || 'Всего пользователей', value: totals.totalUsers, icon: '👥', sub: `${totals.totalVolunteers} ${t.analytics?.volunteersOrgSuffix || 'волонтёров'}, ${totals.totalOrganizers} ${t.analytics?.organizersSuffix || 'орг.'}` },
              { label: t.analytics?.totalProjects || 'Всего проектов', value: totals.totalProjects, icon: '📁', sub: `${totals.totalCompletedProjects} ${t.analytics?.completedSuffix || 'завершено'}` },
              { label: t.analytics?.totalTasks || 'Всего задач', value: totals.totalTasks, icon: '✅', sub: `${totals.totalCompletedTasks} ${t.analytics?.doneSuffix || 'выполнено'}` },
              { label: t.analytics?.completedProjects || 'Завершённых проектов', value: totals.totalCompletedProjects, icon: '🏆', sub: totals.totalProjects > 0 ? `${Math.round((totals.totalCompletedProjects / totals.totalProjects) * 100)}${t.analytics?.ofAllSuffix || '% от всех'}` : '—' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="text-2xl mb-2">{s.icon}</div>
                <div className="text-3xl font-bold text-gray-900">{s.value}</div>
                <div className="text-sm text-gray-600 mt-1">{s.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            {/* Monthly registrations */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">{t.analytics?.monthlyRegistrations || 'Регистрации за 6 месяцев'}</h2>
              <BarChart data={monthlyRegistrations} maxVal={maxReg} color="bg-[#00CC00]" />
            </div>

            {/* Monthly projects */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">{t.analytics?.monthlyProjects || 'Проекты за 6 месяцев'}</h2>
              <BarChart data={monthlyProjects} maxVal={maxProj} color="bg-blue-500" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            {/* Projects by status */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">{t.analytics?.projectsByStatus || 'Проекты по статусам'}</h2>
              <div className="space-y-2">
                {projectsByStatus?.map((p: any) => {
                  const st = PROJECT_STATUS_LABELS[p.status] || { label: p.status, color: 'bg-gray-400' };
                  return (
                    <HorizontalBar key={p.status} label={st.label} count={p.count} total={totalProjectsAll} color={st.color} />
                  );
                })}
              </div>
            </div>

            {/* Projects by category */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">{t.analytics?.projectsByCategory || 'Проекты по категориям'}</h2>
              <div className="space-y-2">
                {categoriesWithCount?.slice(0, 8).map((c: any) => (
                  <HorizontalBar key={c.id} label={c.name} count={c.projectsCount} total={totalProjectsAll} color="bg-purple-400" />
                ))}
              </div>
            </div>
          </div>

          {/* Top volunteers */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-5">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">{t.analytics?.topVolunteersTitle || 'Топ волонтёров'}</h2>
            </div>
            {topVolunteers?.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">{t.analytics?.noData || 'Нет данных'}</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {topVolunteers?.map((v: any, i: number) => (
                  <div key={v.id} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors">
                    <span className={`text-lg font-bold w-6 text-center ${i < 3 ? 'text-amber-500' : 'text-gray-300'}`}>
                      {i + 1}
                    </span>
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                      {v.avatarUrl ? (
                        <img src={v.avatarUrl} alt={v.firstName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-[#00CC00] flex items-center justify-center text-white text-xs font-bold">
                          {v.firstName[0]}{v.lastName[0]}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/admin/users/${v.id}`} className="text-sm font-medium text-gray-900 hover:text-[#00CC00]">
                        {v.firstName} {v.lastName}
                      </Link>
                      <p className="text-xs text-gray-400">{v.city}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900">{v.completedTasks}</p>
                      <p className="text-xs text-gray-400">{t.analytics?.tasksLabel || 'задач'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-[#00CC00]">{Number(v.trustScore).toFixed(1)}</p>
                      <p className="text-xs text-gray-400">{t.analytics?.ratingLabel || 'рейтинг'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top organizers */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">{t.analytics?.topOrganizersTitle || 'Топ организаторов'}</h2>
            </div>
            {topOrganizers?.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">{t.analytics?.noData || 'Нет данных'}</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {topOrganizers?.map((o: any, i: number) => (
                  <div key={o.id} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors">
                    <span className={`text-lg font-bold w-6 text-center ${i < 3 ? 'text-amber-500' : 'text-gray-300'}`}>
                      {i + 1}
                    </span>
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                      {o.avatarUrl ? (
                        <img src={o.avatarUrl} alt={o.firstName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold">
                          {o.firstName[0]}{o.lastName[0]}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/admin/users/${o.id}`} className="text-sm font-medium text-gray-900 hover:text-[#00CC00]">
                        {o.firstName} {o.lastName}
                      </Link>
                      <p className="text-xs text-gray-400">{o.organizationName || o.city}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900">{o.projectsCount}</p>
                      <p className="text-xs text-gray-400">{t.analytics?.projectsLabel || 'проектов'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DynamicContent>
      </div>
    </SidebarProvider>
  );
}
