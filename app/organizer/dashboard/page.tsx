'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import OrganizerNav from '../components/OrganizerNav';
import OrganizerSidebar from '../components/OrganizerSidebar';
import AiSupportButton from '@/app/components/AiSupportButton';
import ApprovalStatus from '../components/ApprovalStatus';
import DynamicContent from '@/app/components/DynamicContent';
import { SidebarProvider } from '@/app/contexts/SidebarContext';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatarUrl?: string;
  organizerProfile?: {
    isApprovedByAdmin: boolean;
    isRejected: boolean;
    approvedAt?: string | null;
    rejectedAt?: string | null;
    rejectionReason?: string | null;
    freePostsRemaining: number;
  };
}

interface Stats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalVolunteers: number;
  pendingApplications: number;
  statusCounts: Record<string, number>;
  recentApplications: {
    id: string;
    status: string;
    appliedAt: string;
    volunteer: { firstName: string; lastName: string; avatarUrl?: string | null };
    project: { id: string; title: string };
  }[];
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  draft:      { label: 'Черновик',        color: 'bg-gray-400',   bg: 'bg-gray-100 text-gray-700' },
  moderation: { label: 'На модерации',    color: 'bg-yellow-400', bg: 'bg-yellow-100 text-yellow-700' },
  recruiting: { label: 'Набор',           color: 'bg-blue-400',   bg: 'bg-blue-100 text-blue-700' },
  upcoming:   { label: 'Скоро',           color: 'bg-purple-400', bg: 'bg-purple-100 text-purple-700' },
  active:     { label: 'Активный',        color: 'bg-green-400',  bg: 'bg-green-100 text-green-700' },
  completed:  { label: 'Завершён',        color: 'bg-emerald-400',bg: 'bg-emerald-100 text-emerald-700' },
  rejected:   { label: 'Отклонён',        color: 'bg-red-400',    bg: 'bg-red-100 text-red-700' },
  cancelled:  { label: 'Отменён',         color: 'bg-orange-400', bg: 'bg-orange-100 text-orange-700' },
  blocked:    { label: 'Заблокирован',    color: 'bg-red-600',    bg: 'bg-red-100 text-red-700' },
};

const APP_STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'На рассмотрении', cls: 'bg-yellow-100 text-yellow-700' },
  approved:  { label: 'Одобрена',        cls: 'bg-green-100 text-green-700' },
  rejected:  { label: 'Отклонена',       cls: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Отменена',        cls: 'bg-gray-100 text-gray-600' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export default function OrganizerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) { router.push('/login'); return; }
        const data = await res.json();
        if (data.user.role !== 'organizer') { router.push('/dashboard'); return; }
        setUser(data.user);

        const statsRes = await fetch('/api/organizer/stats');
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00] mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const totalForChart = stats
    ? Object.values(stats.statusCounts).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50">
        <OrganizerSidebar user={user} />
        <OrganizerNav user={user} />

        <DynamicContent>
          {/* Approval Status */}
          {user.organizerProfile && (
            <ApprovalStatus
              isApproved={user.organizerProfile.isApprovedByAdmin}
              isRejected={user.organizerProfile.isRejected}
              approvedAt={user.organizerProfile.approvedAt}
              rejectedAt={user.organizerProfile.rejectedAt}
              rejectionReason={user.organizerProfile.rejectionReason}
            />
          )}

          {/* Welcome */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Добро пожаловать, {user.firstName}!
            </h1>
            <p className="text-gray-600">Вот обзор ваших проектов и активности</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-gradient-to-br from-[#00CC00] to-emerald-500 rounded-xl p-4 shadow-lg text-white col-span-1">
              <div className="flex flex-col gap-1">
                <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center mb-1">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-2xl font-bold">{user.organizerProfile?.freePostsRemaining ?? 0}</div>
                <div className="text-xs text-emerald-50">Бесплатных публикаций</div>
              </div>
            </div>

            <StatCard
              value={stats?.totalProjects ?? 0}
              label="Всего проектов"
              iconPath="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
            />
            <StatCard
              value={stats?.activeProjects ?? 0}
              label="Активных"
              iconPath="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              iconBg="bg-green-100"
              iconColor="text-green-600"
            />
            <StatCard
              value={stats?.totalVolunteers ?? 0}
              label="Волонтёров"
              iconPath="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              iconBg="bg-purple-100"
              iconColor="text-purple-600"
            />
            <StatCard
              value={stats?.pendingApplications ?? 0}
              label="Заявок ожидают"
              iconPath="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              iconBg="bg-orange-100"
              iconColor="text-orange-600"
              highlight={!!stats?.pendingApplications}
            />
          </div>

          {/* Charts + Recent Applications */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Project status distribution */}
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-300">
              <h3 className="text-lg font-bold text-gray-900 mb-5">Статус проектов</h3>
              {totalForChart > 0 && stats ? (
                <div className="space-y-3">
                  {Object.entries(stats.statusCounts).map(([status, count]) => {
                    const info = STATUS_LABELS[status] ?? { label: status, color: 'bg-gray-400', bg: '' };
                    const pct = Math.round((count / totalForChart) * 100);
                    return (
                      <div key={status}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">{info.label}</span>
                          <span className="font-semibold text-gray-900">{count}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-2 rounded-full ${info.color}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyChart text="Диаграмма появится после создания проектов" />
              )}
            </div>

            {/* Completion stats */}
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-300">
              <h3 className="text-lg font-bold text-gray-900 mb-5">Сводка</h3>
              {stats && stats.totalProjects > 0 ? (
                <div className="space-y-5">
                  <SummaryRow
                    label="Завершено проектов"
                    value={stats.completedProjects}
                    total={stats.totalProjects}
                    color="bg-emerald-400"
                  />
                  <SummaryRow
                    label="Активных проектов"
                    value={stats.activeProjects}
                    total={stats.totalProjects}
                    color="bg-blue-400"
                  />
                  <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900">{stats.totalVolunteers}</div>
                      <div className="text-xs text-gray-500 mt-1">Всего волонтёров участвовало</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-500">{stats.pendingApplications}</div>
                      <div className="text-xs text-gray-500 mt-1">Заявок на рассмотрении</div>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyChart text="Данные появятся после создания проектов" />
              )}
            </div>
          </div>

          {/* Recent Applications */}
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-300 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Последние заявки</h3>
              <Link href="/organizer/volunteers" className="text-sm text-[#00CC00] font-medium hover:underline">
                Смотреть все
              </Link>
            </div>

            {stats && stats.recentApplications.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {stats.recentApplications.map((app) => {
                  const statusInfo = APP_STATUS_LABELS[app.status] ?? { label: app.status, cls: 'bg-gray-100 text-gray-600' };
                  return (
                    <div key={app.id} className="py-3 flex items-center gap-4">
                      {app.volunteer.avatarUrl ? (
                        <img src={app.volunteer.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#00CC00] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {app.volunteer.firstName[0]}{app.volunteer.lastName[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm truncate">
                          {app.volunteer.firstName} {app.volunteer.lastName}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{app.project.title}</div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusInfo.cls}`}>
                          {statusInfo.label}
                        </span>
                        <span className="text-xs text-gray-400">{formatDate(app.appliedAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm mb-4">Заявок пока нет</p>
                <Link
                  href="/organizer/projects"
                  className="inline-block px-5 py-2.5 bg-[#00CC00] text-white rounded-full text-sm font-medium hover:bg-[#00b300] transition-colors"
                >
                  Создать проект
                </Link>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/organizer/projects"
              className="bg-gradient-to-br from-[#00CC00] to-emerald-500 rounded-2xl p-6 text-white hover:shadow-lg transition-shadow group"
            >
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h4 className="text-lg font-bold mb-1">Создать проект</h4>
              <p className="text-sm text-emerald-50">Опубликуйте новый волонтёрский проект</p>
            </Link>

            <Link
              href="/organizer/volunteers"
              className="bg-white rounded-2xl p-6 shadow-xl border border-gray-300 hover:shadow-2xl transition-shadow group"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-1">Волонтёры</h4>
              <p className="text-sm text-gray-600">Просмотр заявок и волонтёров</p>
            </Link>

            <Link
              href="/organizer/reports"
              className="bg-white rounded-2xl p-6 shadow-xl border border-gray-300 hover:shadow-2xl transition-shadow group"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-1">Отчёты</h4>
              <p className="text-sm text-gray-600">Скачать отчёты по проектам</p>
            </Link>
          </div>
        </DynamicContent>

        <AiSupportButton />
      </div>
    </SidebarProvider>
  );
}

function StatCard({
  value, label, iconPath, iconBg, iconColor, highlight,
}: {
  value: number;
  label: string;
  iconPath: string;
  iconBg: string;
  iconColor: string;
  highlight?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl p-4 shadow-xl border ${highlight ? 'border-orange-300' : 'border-gray-300'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 ${iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
          <svg className={`w-5 h-5 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
          </svg>
        </div>
        <div>
          <div className={`text-2xl font-bold ${highlight ? 'text-orange-500' : 'text-gray-900'}`}>{value}</div>
          <div className="text-xs text-gray-600">{label}</div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-700">{label}</span>
        <span className="font-semibold text-gray-900">{value} / {total} ({pct}%)</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="h-48 flex items-center justify-center text-gray-400">
      <div className="text-center">
        <svg className="w-14 h-14 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-sm">{text}</p>
      </div>
    </div>
  );
}
