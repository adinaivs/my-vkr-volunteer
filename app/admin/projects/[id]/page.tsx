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

function Avatar({ user, size = 'sm' }: { user: { firstName: string; lastName: string; avatarUrl?: string | null }; size?: 'sm' | 'md' }) {
  const s = size === 'md' ? 'w-12 h-12 text-base' : 'w-8 h-8 text-xs';
  return user.avatarUrl ? (
    <img src={user.avatarUrl} alt={user.firstName} className={`${s} rounded-full object-cover`} />
  ) : (
    <div className={`${s} rounded-full bg-[#00CC00] flex items-center justify-center text-white font-bold`}>
      {user.firstName[0]}{user.lastName[0]}
    </div>
  );
}

export default function AdminProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const toast = useToast();
  const { t } = useTranslation('admin');

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    draft: { label: t.projects?.projectStatusDraft || 'Черновик', color: 'bg-gray-100 text-gray-600' },
    moderation: { label: t.projects?.projectStatusModeration || 'На модерации', color: 'bg-yellow-100 text-yellow-700' },
    rejected: { label: t.projects?.assignStatusRejected || 'Отклонён', color: 'bg-red-100 text-red-700' },
    recruiting: { label: t.projects?.projectStatusRecruiting || 'Набор', color: 'bg-blue-100 text-blue-700' },
    upcoming: { label: t.projects?.projectStatusUpcoming || 'Скоро', color: 'bg-purple-100 text-purple-700' },
    active: { label: t.common?.active || 'Активен', color: 'bg-green-100 text-green-700' },
    completed: { label: t.projects?.projectStatusCompleted || 'Завершён', color: 'bg-emerald-100 text-emerald-700' },
    cancelled: { label: t.projects?.projectStatusCancelled || 'Отменён', color: 'bg-orange-100 text-orange-700' },
    blocked: { label: t.common?.blocked || 'Заблокирован', color: 'bg-red-100 text-red-800' },
  };

  const TASK_STATUS_LABELS: Record<string, { label: string; color: string }> = {
    pending: { label: t.projects?.taskStatusPending || 'Ожидает', color: 'bg-gray-100 text-gray-600' },
    in_progress: { label: t.projects?.taskStatusInProgress || 'В процессе', color: 'bg-blue-100 text-blue-700' },
    completed: { label: t.projects?.taskStatusCompleted || 'Завершена', color: 'bg-green-100 text-green-700' },
    overdue: { label: t.projects?.taskStatusOverdue || 'Просрочена', color: 'bg-red-100 text-red-700' },
    cancelled: { label: t.projects?.taskStatusCancelled || 'Отменена', color: 'bg-orange-100 text-orange-600' },
  };

  const APP_STATUS_LABELS: Record<string, { label: string; color: string }> = {
    pending: { label: t.projects?.appStatusPending || 'Ожидает', color: 'bg-yellow-100 text-yellow-700' },
    approved: { label: t.projects?.appStatusApproved || 'Принят', color: 'bg-green-100 text-green-700' },
    rejected: { label: t.projects?.appStatusRejected || 'Отклонён', color: 'bg-red-100 text-red-700' },
    cancelled: { label: t.projects?.appStatusCancelled || 'Отменён', color: 'bg-gray-100 text-gray-600' },
  };

  const ASSIGN_STATUS_LABELS: Record<string, { label: string; color: string }> = {
    assigned: { label: t.projects?.assignStatusAssigned || 'Назначен', color: 'bg-blue-100 text-blue-700' },
    completed: { label: t.projects?.assignStatusCompleted || 'Выполнил', color: 'bg-yellow-100 text-yellow-700' },
    confirmed: { label: t.projects?.assignStatusConfirmed || 'Подтверждено', color: 'bg-green-100 text-green-700' },
    rejected: { label: t.projects?.assignStatusRejected || 'Отклонён', color: 'bg-red-100 text-red-700' },
    cancelled: { label: t.projects?.assignStatusCancelled || 'Отменён', color: 'bg-gray-100 text-gray-600' },
  };

  const [me, setMe] = useState<AdminUser | null>(null);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [blockModal, setBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) { router.push('/admin/login'); return; }
        const { user } = await meRes.json();
        if (user.role !== 'admin') { router.push('/'); return; }
        setMe(user);
        const res = await fetch(`/api/admin/projects/${id}`);
        if (!res.ok) { router.push('/admin/projects'); return; }
        setProject((await res.json()).project);
      } finally { setLoading(false); }
    };
    init();
  }, [id, router]);

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/projects/${id}/approve`, { method: 'POST' });
      if (res.ok) { toast.success(t.projects?.approved || 'Проект одобрен'); setProject((p: any) => ({ ...p, status: 'recruiting' })); }
      else toast.error((await res.json()).error || 'Ошибка');
    } finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error(t.projects?.rejectReasonRequired || 'Укажите причину отклонения'); return; }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/projects/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (res.ok) {
        toast.success(t.projects?.rejected || 'Проект отклонён');
        setProject((p: any) => ({ ...p, status: 'rejected', rejectionReason: rejectReason }));
        setRejectModal(false);
      } else toast.error((await res.json()).error || 'Ошибка');
    } finally { setActionLoading(false); }
  };

  const handleBlock = async () => {
    if (!blockReason.trim()) { toast.error('Укажите причину блокировки'); return; }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/projects/${id}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: blockReason }),
      });
      if (res.ok) {
        toast.success('Проект заблокирован');
        setProject((p: any) => ({ ...p, status: 'blocked', blockReason, blockedFrom: p.status }));
        setBlockModal(false);
        setBlockReason('');
      } else toast.error((await res.json()).error || 'Ошибка');
    } finally { setActionLoading(false); }
  };

  const handleUnblock = async () => {
    if (!confirm('Разблокировать проект? Он вернётся в предыдущий статус.')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/projects/${id}/unblock`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Проект разблокирован. Статус восстановлен: ${STATUS_LABELS[data.restoredStatus]?.label ?? data.restoredStatus}`);
        setProject((p: any) => ({ ...p, status: data.restoredStatus, blockReason: null, blockedFrom: null }));
      } else toast.error((await res.json()).error || 'Ошибка');
    } finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    if (!confirm(t.projects?.deleteConfirm || 'Удалить проект? Это действие нельзя отменить.')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/projects/${id}`, { method: 'DELETE' });
      if (res.ok) { toast.success(t.projects?.deleteProject || 'Проект удалён'); router.push('/admin/projects'); }
      else toast.error((await res.json()).error || 'Ошибка');
    } finally { setActionLoading(false); }
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00]" />
    </div>
  );

  if (!project) return null;

  const st = STATUS_LABELS[project.status] || { label: project.status, color: 'bg-gray-100 text-gray-600' };
  const catName = project.category?.translations?.find((tr: any) => tr.locale === 'ru')?.name || project.category?.slug;

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50">
        {me && <><AdminNav user={me} /><AdminSidebar user={me} /></>}
        <DynamicContent>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <Link href="/admin/projects" className="hover:text-[#00CC00] transition-colors">{t.projects?.title || 'Проекты'}</Link>
            <span>/</span>
            <span className="text-gray-800 truncate max-w-xs">{project.title}</span>
          </div>

          {/* Header */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-5">
            {project.imageUrl && (
              <img src={project.imageUrl} alt={project.title} className="w-full h-48 object-cover" />
            )}
            <div className="p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    {project.category?.icon && <SvgIcon iconKey={project.category.icon} className="w-6 h-6" />}
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{catName}</span>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.color}`}>{st.label}</span>
                    {project.isPaid && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">{t.projects?.paidLabel || 'Платный'}</span>}
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">{project.title}</h1>
                  <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      {project.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      {fmt(project.startDate)} — {fmt(project.endDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      {project.currentVolunteers} / {project.maxVolunteers}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap shrink-0">
                  {project.status === 'moderation' && (
                    <>
                      <button onClick={handleApprove} disabled={actionLoading}
                        className="px-4 py-2 bg-[#00CC00] text-white rounded-xl text-sm hover:bg-[#00b300] transition-colors disabled:opacity-50">
                        {t.projects?.approveBtn || 'Одобрить'}
                      </button>
                      <button onClick={() => setRejectModal(true)} disabled={actionLoading}
                        className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm hover:bg-red-600 transition-colors disabled:opacity-50">
                        {t.projects?.rejectBtn || 'Отклонить'}
                      </button>
                    </>
                  )}
                  {/* Блокировка — для любого не-терминального статуса кроме blocked */}
                  {!['completed', 'cancelled', 'blocked'].includes(project.status) && (
                    <button onClick={() => setBlockModal(true)} disabled={actionLoading}
                      className="px-4 py-2 bg-gray-800 text-white rounded-xl text-sm hover:bg-gray-900 transition-colors disabled:opacity-50 flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      Заблокировать
                    </button>
                  )}
                  {/* Разблокировка */}
                  {project.status === 'blocked' && (
                    <button onClick={handleUnblock} disabled={actionLoading}
                      className="px-4 py-2 bg-[#00CC00] text-white rounded-xl text-sm hover:bg-[#00b300] transition-colors disabled:opacity-50 flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      </svg>
                      Разблокировать
                    </button>
                  )}
                  <button onClick={handleDelete} disabled={actionLoading}
                    className="px-4 py-2 border border-red-200 text-red-500 rounded-xl text-sm hover:bg-red-50 transition-colors disabled:opacity-50">
                    {t.projects?.deleteBtn || 'Удалить'}
                  </button>
                </div>
              </div>
              {project.rejectionReason && (
                <div className="mt-4 p-3 bg-red-50 rounded-xl text-sm text-red-700">
                  <span className="font-medium">{t.projects?.rejectionReasonLabel || 'Причина отклонения:'}</span> {project.rejectionReason}
                </div>
              )}
              {project.status === 'blocked' && project.blockReason && (
                <div className="mt-4 p-3 bg-gray-800 rounded-xl text-sm text-white flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 shrink-0 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  <div>
                    <span className="font-medium text-gray-200">Причина блокировки: </span>
                    <span className="text-gray-300">{project.blockReason}</span>
                    {project.blockedFrom && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Предыдущий статус: {STATUS_LABELS[project.blockedFrom]?.label ?? project.blockedFrom}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-5">
              {/* Description */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-3">{t.projects?.descriptionLabel || 'Описание'}</h2>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{project.description}</p>
              </div>

              {/* Tasks */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-gray-900">{t.projects?.tasksLabel || 'Задачи'}</h2>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{project.tasks?.length || 0}</span>
                </div>
                {(!project.tasks || project.tasks.length === 0) ? (
                  <div className="p-8 text-center text-gray-400 text-sm">{t.projects?.noTasks || 'Задачи не добавлены'}</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {project.tasks.map((task: any) => {
                      const ts = TASK_STATUS_LABELS[task.status] || { label: task.status, color: 'bg-gray-100 text-gray-600' };
                      const isOpen = expandedTask === task.id;
                      return (
                        <div key={task.id}>
                          <button onClick={() => setExpandedTask(isOpen ? null : task.id)}
                            className="w-full flex items-center gap-3 px-6 py-4 hover:bg-gray-50 transition-colors text-left">
                            <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{task.title}</p>
                              <p className="text-xs text-gray-400">
                                {task.skill?.name && <span>{t.projects?.skillLabel || 'Навык:'} {task.skill.name} · </span>}
                                {t.projects?.deadlinePrefix || 'До'} {fmt(task.deadline)} · {task.currentVolunteers}/{task.requiredVolunteers} {t.projects?.volunteers || 'волонтёров'}
                              </p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${ts.color}`}>{ts.label}</span>
                          </button>
                          {isOpen && (
                            <div className="px-6 pb-4 bg-gray-50">
                              <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                              {task.assignments?.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t.projects?.assignedVolunteers || 'Назначенные волонтёры'}</p>
                                  {task.assignments.map((a: any) => {
                                    const as = ASSIGN_STATUS_LABELS[a.status] || { label: a.status, color: 'bg-gray-100 text-gray-600' };
                                    return (
                                      <div key={a.id} className="flex items-center gap-3 bg-white rounded-xl p-3">
                                        <Avatar user={a.volunteer} />
                                        <div className="flex-1 min-w-0">
                                          <Link href={`/admin/users/${a.volunteer.id}`} className="text-sm font-medium text-gray-900 hover:text-[#00CC00]">
                                            {a.volunteer.firstName} {a.volunteer.lastName}
                                          </Link>
                                          {a.feedback && <p className="text-xs text-gray-400 truncate">{a.feedback}</p>}
                                          {a.rating && <p className="text-xs text-yellow-600">{'★'.repeat(a.rating)}</p>}
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded-full ${as.color}`}>{as.label}</span>
                                        {a.report && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">{t.projects?.reportLabel || 'Отчёт'}</span>}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Applications */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-gray-900">{t.projects?.applicationsLabel || 'Заявки волонтёров'}</h2>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{project.applications?.length || 0}</span>
                </div>
                {(!project.applications || project.applications.length === 0) ? (
                  <div className="p-8 text-center text-gray-400 text-sm">{t.projects?.noApplications || 'Заявок нет'}</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {project.applications.map((app: any) => {
                      const as = APP_STATUS_LABELS[app.status] || { label: app.status, color: 'bg-gray-100 text-gray-600' };
                      return (
                        <div key={app.id} className="flex items-start gap-3 px-6 py-4 hover:bg-gray-50 transition-colors">
                          <Avatar user={app.volunteer} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link href={`/admin/users/${app.volunteer.id}`} className="text-sm font-medium text-gray-900 hover:text-[#00CC00]">
                                {app.volunteer.firstName} {app.volunteer.lastName}
                              </Link>
                              {app.volunteer.volunteerProfile && (
                                <span className="text-xs text-gray-400">
                                  {t.projects?.ratingLabel || 'Рейтинг:'} {Number(app.volunteer.volunteerProfile.trustScore).toFixed(1)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">{app.volunteer.email}</p>
                            {app.message && <p className="text-xs text-gray-600 mt-1 italic">«{app.message}»</p>}
                            <p className="text-xs text-gray-400 mt-1">{fmt(app.appliedAt)}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${as.color}`}>{as.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-5">
              {/* Organizer */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="text-base font-semibold text-gray-900 mb-4">{t.projects?.organizerLabel || 'Организатор'}</h2>
                <div className="flex items-center gap-3 mb-4">
                  <Avatar user={project.organizer} size="md" />
                  <div>
                    <Link href={`/admin/users/${project.organizer.id}`} className="text-sm font-medium text-gray-900 hover:text-[#00CC00]">
                      {project.organizer.firstName} {project.organizer.lastName}
                    </Link>
                    {project.organizer.organizerProfile && (
                      <p className="text-xs text-gray-500">{project.organizer.organizerProfile.organizationName}</p>
                    )}
                    <p className="text-xs text-gray-400">{project.organizer.email}</p>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-gray-500">
                  <div className="flex items-center gap-2"><span>📱</span><span>{project.organizer.phone}</span></div>
                  <div className="flex items-center gap-2"><span>🏙️</span><span>{project.organizer.city}</span></div>
                </div>
              </div>

              {/* Participants */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-gray-900">{t.projects?.participantsLabel || 'Участники'}</h2>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{project.participants?.length || 0}</span>
                </div>
                {(!project.participants || project.participants.length === 0) ? (
                  <p className="text-xs text-gray-400 text-center py-2">{t.projects?.noParticipants || 'Участников нет'}</p>
                ) : (
                  <div className="space-y-2">
                    {project.participants.slice(0, 8).map((p: any) => (
                      <div key={p.id} className="flex items-center gap-2">
                        <Avatar user={p.volunteer} />
                        <Link href={`/admin/users/${p.volunteer.id}`} className="text-xs text-gray-700 hover:text-[#00CC00] truncate">
                          {p.volunteer.firstName} {p.volunteer.lastName}
                        </Link>
                        {!p.isActive && <span className="text-xs text-gray-400">{t.projects?.leftLabel || '(вышел)'}</span>}
                      </div>
                    ))}
                    {project.participants.length > 8 && (
                      <p className="text-xs text-gray-400 text-center">+{project.participants.length - 8} {t.projects?.moreParticipants || 'ещё'}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Dates and meta */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="text-base font-semibold text-gray-900 mb-4">{t.projects?.infoLabel || 'Информация'}</h2>
                <div className="space-y-2 text-xs text-gray-600">
                  <div className="flex justify-between"><span className="text-gray-400">{t.projects?.createdLabel || 'Создан'}</span><span>{fmt(project.createdAt)}</span></div>
                  {project.publishedAt && <div className="flex justify-between"><span className="text-gray-400">{t.projects?.publishedLabel || 'Опубликован'}</span><span>{fmt(project.publishedAt)}</span></div>}
                  {project.moderatedAt && <div className="flex justify-between"><span className="text-gray-400">{t.projects?.moderatedLabel || 'Промодерирован'}</span><span>{fmt(project.moderatedAt)}</span></div>}
                  <div className="flex justify-between"><span className="text-gray-400">{t.projects?.tasksCount || 'Задач'}</span><span>{project.tasks?.length || 0}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">{t.projects?.applicationsCount || 'Заявок'}</span><span>{project.applications?.length || 0}</span></div>
                </div>
              </div>

              {/* Chat */}
              {project.chat && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <h2 className="text-base font-semibold text-gray-900 mb-3">{t.projects?.groupChatLabel || 'Групповой чат'}</h2>
                  <div className="space-y-1.5 text-xs text-gray-600">
                    <div className="flex justify-between"><span className="text-gray-400">{t.projects?.chatNameLabel || 'Название'}</span><span className="truncate ml-2">{project.chat.name}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">{t.projects?.chatMembersLabel || 'Участников'}</span><span>{project.chat._count.members}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">{t.projects?.chatMessagesLabel || 'Сообщений'}</span><span>{project.chat._count.messages}</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DynamicContent>
      </div>

      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.projects?.rejectModalTitle || 'Отклонить проект'}</h3>
            <label className="text-xs font-medium text-gray-600 mb-1 block">{t.projects?.rejectReason || 'Причина отклонения *'}</label>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={4}
              placeholder={t.projects?.rejectReasonPlaceholder || 'Опишите причину отклонения...'}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setRejectModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">
                {t.projects?.cancelBtn || 'Отмена'}
              </button>
              <button onClick={handleReject} disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl text-sm hover:bg-red-600 disabled:opacity-50">
                {t.projects?.rejectBtn || 'Отклонить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {blockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Заблокировать проект</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Проект будет заблокирован. Организатор не сможет менять статус. При разблокировке статус автоматически восстановится.
            </p>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Причина блокировки *</label>
            <textarea
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              rows={3}
              placeholder="Опишите причину блокировки..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => { setBlockModal(false); setBlockReason(''); }}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">
                Отмена
              </button>
              <button onClick={handleBlock} disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-xl text-sm hover:bg-gray-900 disabled:opacity-50">
                Заблокировать
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarProvider>
  );
}
