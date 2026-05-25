'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import AdminNav from '../../components/AdminNav';
import AdminSidebar from '../../components/AdminSidebar';
import DynamicContent from '@/app/components/DynamicContent';
import { SidebarProvider } from '@/app/contexts/SidebarContext';
import { useToast } from '@/app/components/ToastContainer';
import { useTranslation } from '@/app/i18n/useTranslation';
import { SvgIcon } from '@/app/components/SvgIcon';

interface AdminUser { id: string; firstName: string; lastName: string; email: string; role: string; avatarUrl?: string; }

function Avatar({ user, size = 'md' }: { user: any; size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'w-8 h-8 text-xs', md: 'w-12 h-12 text-base', lg: 'w-20 h-20 text-2xl' }[size];
  return user.avatarUrl ? (
    <img src={user.avatarUrl} alt={user.firstName} className={`${s} rounded-full object-cover`} />
  ) : (
    <div className={`${s} rounded-full bg-[#00CC00] flex items-center justify-center text-white font-bold`}>
      {user.firstName?.[0]}{user.lastName?.[0]}
    </div>
  );
}

export default function AdminUserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const toast = useToast();
  const { t } = useTranslation('admin');

  const ROLE_LABELS: Record<string, { label: string; color: string }> = {
    volunteer: { label: t.users?.roleVolunteer || 'Волонтёр', color: 'bg-blue-100 text-blue-700' },
    organizer: { label: t.users?.roleOrganizer || 'Организатор', color: 'bg-purple-100 text-purple-700' },
    admin: { label: t.users?.roleAdmin || 'Администратор', color: 'bg-gray-100 text-gray-700' },
  };

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    active: { label: t.users?.statusActive || 'Активен', color: 'bg-green-100 text-green-700' },
    inactive: { label: t.users?.statusInactive || 'Неактивен', color: 'bg-gray-100 text-gray-500' },
    blocked: { label: t.users?.statusBlocked || 'Заблокирован', color: 'bg-red-100 text-red-700' },
    deleted: { label: t.users?.statusDeleted || 'Удалён', color: 'bg-red-200 text-red-800' },
  };

  const PROJECT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
    draft: { label: t.users?.projectStatusDraft || 'Черновик', color: 'bg-gray-100 text-gray-600' },
    moderation: { label: t.users?.projectStatusModeration || 'Модерация', color: 'bg-yellow-100 text-yellow-700' },
    rejected: { label: t.users?.projectStatusRejected || 'Отклонён', color: 'bg-red-100 text-red-700' },
    recruiting: { label: t.users?.projectStatusRecruiting || 'Набор', color: 'bg-blue-100 text-blue-700' },
    upcoming: { label: t.users?.projectStatusUpcoming || 'Скоро', color: 'bg-purple-100 text-purple-700' },
    active: { label: t.users?.projectStatusActive || 'Активен', color: 'bg-green-100 text-green-700' },
    completed: { label: t.users?.projectStatusCompleted || 'Завершён', color: 'bg-emerald-100 text-emerald-700' },
    cancelled: { label: t.users?.projectStatusCancelled || 'Отменён', color: 'bg-orange-100 text-orange-600' },
    blocked: { label: t.users?.projectStatusBlocked || 'Заблокирован', color: 'bg-red-100 text-red-800' },
  };

  const ASSIGN_STATUS_LABELS: Record<string, string> = {
    assigned: t.users?.taskStatusAssigned || 'Назначен',
    completed: t.users?.taskStatusCompleted || 'Выполнил',
    confirmed: t.users?.taskStatusConfirmed || 'Подтверждено',
    rejected: t.users?.taskStatusRejected || 'Отклонён',
    cancelled: t.users?.taskStatusCancelled || 'Отменён',
  };

  const VERIF_STATUS_LABELS: Record<string, { label: string; color: string }> = {
    pending: { label: t.users?.verifPending || 'На проверке', color: 'bg-yellow-100 text-yellow-700' },
    verified: { label: t.users?.verifVerified || 'Верифицирован', color: 'bg-green-100 text-green-700' },
    rejected: { label: t.users?.verifRejected || 'Отклонён', color: 'bg-red-100 text-red-700' },
    blocked: { label: t.users?.verifBlocked || 'Заблокирован', color: 'bg-red-200 text-red-800' },
  };

  const [me, setMe] = useState<AdminUser | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fmt = (d: string) => new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });

  useEffect(() => {
    const init = async () => {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) { router.push('/admin/login'); return; }
        const { user: me } = await meRes.json();
        if (me.role !== 'admin') { router.push('/'); return; }
        setMe(me);
        const res = await fetch(`/api/admin/users/${id}`);
        if (!res.ok) { router.push('/admin/users'); return; }
        setUser((await res.json()).user);
      } finally { setLoading(false); }
    };
    init();
  }, [id, router]);

  const handleToggleBlock = async () => {
    const isBlocked = user.status === 'blocked';
    const newStatus = isBlocked ? 'active' : 'blocked';
    if (!confirm(isBlocked ? (t.users?.unblockConfirm || 'Разблокировать пользователя?') : (t.users?.blockConfirm || 'Заблокировать пользователя?'))) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(isBlocked ? (t.users?.unblocked || 'Пользователь разблокирован') : (t.users?.blocked || 'Пользователь заблокирован'));
        setUser((u: any) => ({ ...u, status: newStatus }));
      } else toast.error((await res.json()).error || 'Ошибка');
    } finally { setActionLoading(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00]" />
    </div>
  );

  if (!user) return null;

  const role = ROLE_LABELS[user.role] || { label: user.role, color: 'bg-gray-100 text-gray-600' };
  const st = STATUS_LABELS[user.status] || { label: user.status, color: 'bg-gray-100 text-gray-600' };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50">
        {me && <><AdminNav user={me} /><AdminSidebar user={me} /></>}
        <DynamicContent>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <Link href="/admin/users" className="hover:text-[#00CC00] transition-colors">{t.users?.title || 'Пользователи'}</Link>
            <span>/</span>
            <span className="text-gray-800">{user.firstName} {user.lastName}</span>
          </div>

          {/* Profile header */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5">
            <div className="flex items-start gap-5 flex-wrap">
              <Avatar user={user} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-900">{user.firstName} {user.lastName}</h1>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${role.color}`}>{role.label}</span>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.color}`}>{st.label}</span>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {user.email}
                  </span>
                  {user.phone && (
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {user.phone}
                    </span>
                  )}
                  {user.city && (
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {user.city}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {t.users?.registeredLabel || 'Зарегистрирован'} {fmt(user.createdAt)}
                  </span>
                </div>
              </div>
              {user.role !== 'admin' && (
                <button onClick={handleToggleBlock} disabled={actionLoading}
                  className={`px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-50 shrink-0 ${
                    user.status === 'blocked'
                      ? 'bg-green-50 border border-green-200 text-green-700 hover:bg-green-100'
                      : 'bg-red-50 border border-red-200 text-red-600 hover:bg-red-100'
                  }`}>
                  {user.status === 'blocked' ? (t.users?.unblockUser || 'Разблокировать') : (t.users?.blockUser || 'Заблокировать')}
                </button>
              )}
            </div>
          </div>

          {/* Volunteer section */}
          {user.role === 'volunteer' && (
            <div className="space-y-5">
              {/* Stats */}
              {user.volunteerProfile && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
                    <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{Number(user.volunteerProfile.trustScore).toFixed(1)}</div>
                    <div className="text-xs text-gray-500 mt-1">{t.users?.trustScoreLabel || 'Рейтинг доверия'}</div>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{user.volunteerProfile.completedTasks}</div>
                    <div className="text-xs text-gray-500 mt-1">{t.users?.completedTasksLabel || 'Выполнено задач'}</div>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{user.volunteerProfile.completedProjects}</div>
                    <div className="text-xs text-gray-500 mt-1">{t.users?.completedProjectsLabel || 'Проектов завершено'}</div>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{user.achievements?.length || 0}</div>
                    <div className="text-xs text-gray-500 mt-1">{t.users?.achievementsLabel || 'Достижений'}</div>
                  </div>
                </div>
              )}

              {/* Bio */}
              {user.volunteerProfile?.bio && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <h2 className="text-base font-semibold text-gray-900 mb-2">{t.users?.bioLabel || 'О себе'}</h2>
                  <p className="text-sm text-gray-700">{user.volunteerProfile.bio}</p>
                </div>
              )}

              {/* Skills */}
              {user.skills?.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <h2 className="text-base font-semibold text-gray-900 mb-3">{t.users?.skillsLabel || 'Навыки'}</h2>
                  <div className="flex flex-wrap gap-2">
                    {user.skills.map((us: any) => {
                      const name = us.skill.translations?.find((tr: any) => tr.locale === 'ru')?.name || us.skill.name;
                      return (
                        <span key={us.skillId} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                          {name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Achievements */}
              {user.achievements?.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <h2 className="text-base font-semibold text-gray-900 mb-3">{t.users?.achievementsSectionLabel || 'Достижения'}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {user.achievements.map((ua: any) => {
                      const name = ua.achievement.translations?.find((tr: any) => tr.locale === 'ru')?.name || ua.achievement.name;
                      return (
                        <div key={ua.id} className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                          <div className="w-9 h-9 flex items-center justify-center bg-amber-100 rounded-xl flex-shrink-0 text-amber-600 overflow-hidden">
                            <SvgIcon iconKey={ua.achievement.icon} className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                            <p className="text-xs text-gray-400">{t.users?.receivedLabel || 'Получено'} {fmt(ua.createdAt)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Task assignments */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-gray-900">{t.users?.taskHistoryLabel || 'История задач'}</h2>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{user.taskAssignments?.length || 0}</span>
                </div>
                {(!user.taskAssignments || user.taskAssignments.length === 0) ? (
                  <div className="p-8 text-center text-gray-400 text-sm">{t.users?.noTasks || 'Задач нет'}</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {user.taskAssignments.map((a: any) => (
                      <div key={a.id} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{a.task.title}</p>
                          <Link href={`/admin/projects/${a.task.project.id}`} className="text-xs text-gray-400 hover:text-[#00CC00]">
                            {a.task.project.title}
                          </Link>
                        </div>
                        <span className="text-xs text-gray-400">{ASSIGN_STATUS_LABELS[a.status] || a.status}</span>
                        <span className="text-xs text-gray-400 shrink-0">{fmt(a.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Project participations */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-gray-900">{t.users?.projectsLabel || 'Проекты'}</h2>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{user.projectParticipants?.length || 0}</span>
                </div>
                {(!user.projectParticipants || user.projectParticipants.length === 0) ? (
                  <div className="p-8 text-center text-gray-400 text-sm">{t.users?.noProjects || 'Проектов нет'}</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {user.projectParticipants.map((pp: any) => {
                      const ps = PROJECT_STATUS_LABELS[pp.project.status] || { label: pp.project.status, color: 'bg-gray-100 text-gray-600' };
                      const catName = pp.project.category?.translations?.find((tr: any) => tr.locale === 'ru')?.name || '';
                      return (
                        <div key={pp.id} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors">
                          {pp.project.category?.icon && (
                            <div className="w-7 h-7 flex items-center justify-center bg-green-50 rounded-lg flex-shrink-0 text-[#00CC00] overflow-hidden">
                              <SvgIcon iconKey={pp.project.category.icon} className="w-4 h-4" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <Link href={`/admin/projects/${pp.project.id}`} className="text-sm font-medium text-gray-900 hover:text-[#00CC00] truncate block">
                              {pp.project.title}
                            </Link>
                            <p className="text-xs text-gray-400">{catName} · {fmt(pp.joinedAt)}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${ps.color}`}>{ps.label}</span>
                          {!pp.isActive && <span className="text-xs text-gray-400">{t.users?.leftLabel || '(вышел)'}</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Organizer section */}
          {user.role === 'organizer' && (
            <div className="space-y-5">
              {user.organizerProfile && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h2 className="text-base font-semibold text-gray-900 mb-4">{t.users?.orgSectionLabel || 'Организация'}</h2>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">{t.users?.orgNameLabel || 'Название'}</p>
                        <p className="font-medium text-gray-800">{user.organizerProfile.organizationName}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><p className="text-xs text-gray-400">{t.users?.innLabel || 'ИНН'}</p><p className="font-mono text-sm">{user.organizerProfile.inn}</p></div>
                        <div><p className="text-xs text-gray-400">{t.users?.okpoLabel || 'ОКПО'}</p><p className="font-mono text-sm">{user.organizerProfile.okpo}</p></div>
                      </div>
                      <div><p className="text-xs text-gray-400">{t.users?.legalAddressLabel || 'Юридический адрес'}</p><p className="text-sm">{user.organizerProfile.legalAddress}</p></div>
                      <div><p className="text-xs text-gray-400">{t.users?.actualAddressLabel || 'Фактический адрес'}</p><p className="text-sm">{user.organizerProfile.actualAddress}</p></div>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h2 className="text-base font-semibold text-gray-900 mb-4">{t.users?.verifSectionLabel || 'Верификация'}</h2>
                    <div className="space-y-3 text-sm">
                      {(() => {
                        const vs = VERIF_STATUS_LABELS[user.organizerProfile.verificationStatus] || { label: user.organizerProfile.verificationStatus, color: 'bg-gray-100 text-gray-600' };
                        return (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{t.users?.statusLabel || 'Статус:'}</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${vs.color}`}>{vs.label}</span>
                          </div>
                        );
                      })()}
                      {user.organizerProfile.rejectionReason && (
                        <div className="p-3 bg-red-50 rounded-xl text-xs text-red-700">
                          <span className="font-medium">{t.users?.rejectionReasonLabel || 'Причина отклонения:'} </span>{user.organizerProfile.rejectionReason}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-400">{t.users?.freePostsLabel || 'Бесплатных публикаций'}</p>
                          <p className="font-bold text-lg text-gray-900">{user.organizerProfile.freePostsRemaining}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">{t.users?.paidPostsLabel || 'Платных публикаций'}</p>
                          <p className="font-bold text-lg text-gray-900">{user.organizerProfile.totalPaidPosts}</p>
                        </div>
                      </div>
                      {user.organizerProfile.verificationDocUrl && (
                        <a href={user.organizerProfile.verificationDocUrl} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          {t.users?.verifDocLabel || 'Документ верификации'}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Organizer projects */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-gray-900">{t.users?.orgProjectsLabel || 'Проекты организатора'}</h2>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{user.projects?.length || 0}</span>
                </div>
                {(!user.projects || user.projects.length === 0) ? (
                  <div className="p-8 text-center text-gray-400 text-sm">{t.users?.noProjects || 'Проектов нет'}</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {user.projects.map((p: any) => {
                      const ps = PROJECT_STATUS_LABELS[p.status] || { label: p.status, color: 'bg-gray-100 text-gray-600' };
                      const catName = p.category?.translations?.find((tr: any) => tr.locale === 'ru')?.name || '';
                      return (
                        <div key={p.id} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors">
                          {p.category?.icon && (
                            <div className="w-7 h-7 flex items-center justify-center bg-green-50 rounded-lg flex-shrink-0 text-[#00CC00] overflow-hidden">
                              <SvgIcon iconKey={p.category.icon} className="w-4 h-4" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <Link href={`/admin/projects/${p.id}`} className="text-sm font-medium text-gray-900 hover:text-[#00CC00] truncate block">
                              {p.title}
                            </Link>
                            <p className="text-xs text-gray-400">{catName} · {p.currentVolunteers}/{p.maxVolunteers} {t.users?.volunteersCountSuffix || 'волонтёров'}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${ps.color}`}>{ps.label}</span>
                          <span className="text-xs text-gray-400 shrink-0">{fmt(p.createdAt)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </DynamicContent>
      </div>
    </SidebarProvider>
  );
}
