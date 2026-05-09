'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminNav from '../components/AdminNav';
import AdminSidebar from '../components/AdminSidebar';
import DynamicContent from '@/app/components/DynamicContent';
import { SidebarProvider } from '@/app/contexts/SidebarContext';
import { useToast } from '@/app/components/ToastContainer';

interface User {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  city: string;
  avatarUrl?: string;
  createdAt: string;
  volunteerProfile?: { completedTasks: number; completedProjects: number; trustScore: string };
  organizerProfile?: {
    organizationName: string;
    isApprovedByAdmin: boolean;
    isRejected: boolean;
    verificationStatus: string;
    freePostsRemaining: number;
  };
}

interface AdminUser { id: string; email: string; firstName: string; lastName: string; role: string; }

const ROLE_LABELS: Record<string, string> = { volunteer: 'Волонтёр', organizer: 'Организатор' };
const STATUS_LABELS: Record<string, string> = { active: 'Активен', blocked: 'Заблокирован', inactive: 'Неактивен' };

export default function AdminUsersPage() {
  const router = useRouter();
  const toast = useToast();
  const [me, setMe] = useState<AdminUser | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Фильтры
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [orgStatus, setOrgStatus] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  const [blockingId, setBlockingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ user: User; newStatus: string } | null>(null);

  const buildParams = useCallback((p = page) => {
    const params = new URLSearchParams({ page: String(p), sort });
    if (roleFilter !== 'all') params.set('role', roleFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (search) params.set('search', search);
    if (cityFilter) params.set('city', cityFilter);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (orgStatus !== 'all' && roleFilter === 'organizer') params.set('orgStatus', orgStatus);
    return params;
  }, [page, sort, roleFilter, statusFilter, search, cityFilter, dateFrom, dateTo, orgStatus]);

  const fetchUsers = useCallback(async (p = 1) => {
    const res = await fetch(`/api/admin/users?${buildParams(p)}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
      setTotal(data.total);
      setPages(data.pages);
      if (data.cities?.length) setCities(data.cities);
    }
  }, [buildParams]);

  useEffect(() => {
    const init = async () => {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) { router.push('/admin/login'); return; }
        const { user } = await meRes.json();
        if (user.role !== 'admin') { router.push('/'); return; }
        setMe(user);
        await fetchUsers(1);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  const applyFilters = () => { setPage(1); fetchUsers(1); };
  const resetFilters = () => {
    setSearch(''); setRoleFilter('all'); setStatusFilter('all');
    setCityFilter(''); setDateFrom(''); setDateTo('');
    setOrgStatus('all'); setSort('newest'); setPage(1);
    setTimeout(() => fetchUsers(1), 0);
  };

  const handleStatusChange = async () => {
    if (!confirmModal) return;
    const { user, newStatus } = confirmModal;
    setBlockingId(user.id);
    setConfirmModal(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(newStatus === 'blocked' ? `${user.firstName} ${user.lastName} заблокирован` : `${user.firstName} ${user.lastName} разблокирован`);
        setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, status: newStatus } : u));
      } else {
        const err = await res.json();
        toast.error(err.error || 'Ошибка');
      }
    } catch { toast.error('Ошибка сети'); }
    finally { setBlockingId(null); }
  };

  const activeFiltersCount = [
    roleFilter !== 'all', statusFilter !== 'all', cityFilter,
    dateFrom, dateTo, orgStatus !== 'all' && roleFilter === 'organizer', sort !== 'newest',
  ].filter(Boolean).length;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00]" />
    </div>
  );

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50">
        {me && <><AdminNav user={me} /><AdminSidebar user={me} /></>}

        <DynamicContent>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Пользователи</h1>
              <p className="text-gray-500 mt-1 text-sm">Управление волонтёрами и организаторами · {total} чел.</p>
            </div>
          </div>

          {/* Поиск + кнопка фильтров */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
            <div className="flex gap-3 items-center">
              <div className="flex-1 relative">
                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                  placeholder="Поиск по имени, email, телефону..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00]"
                />
              </div>
              <button
                onClick={applyFilters}
                className="px-4 py-2 bg-[#00CC00] text-white rounded-xl text-sm hover:bg-[#00b300] transition-colors"
              >
                Найти
              </button>
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm transition-colors ${filtersOpen ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 hover:bg-gray-50'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                </svg>
                Фильтры
                {activeFiltersCount > 0 && (
                  <span className="bg-[#00CC00] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
              {activeFiltersCount > 0 && (
                <button onClick={resetFilters} className="px-3 py-2 text-sm text-gray-500 hover:text-red-500 transition-colors">
                  Сбросить
                </button>
              )}
            </div>

            {/* Расширенные фильтры */}
            {filtersOpen && (
              <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Роль</label>
                  <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00]">
                    <option value="all">Все роли</option>
                    <option value="volunteer">Волонтёры</option>
                    <option value="organizer">Организаторы</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Статус</label>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00]">
                    <option value="all">Все статусы</option>
                    <option value="active">Активные</option>
                    <option value="blocked">Заблокированные</option>
                    <option value="inactive">Неактивные</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Город</label>
                  <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00]">
                    <option value="">Все города</option>
                    {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Сортировка</label>
                  <select value={sort} onChange={(e) => setSort(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00]">
                    <option value="newest">Сначала новые</option>
                    <option value="oldest">Сначала старые</option>
                    <option value="name_asc">Имя А→Я</option>
                    <option value="name_desc">Имя Я→А</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Дата регистрации от</label>
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00]" />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Дата регистрации до</label>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00]" />
                </div>

                {roleFilter === 'organizer' && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Статус верификации</label>
                    <select value={orgStatus} onChange={(e) => setOrgStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00]">
                      <option value="all">Все</option>
                      <option value="approved">Подтверждённые</option>
                      <option value="pending">Ожидают проверки</option>
                      <option value="rejected">Отклонённые</option>
                    </select>
                  </div>
                )}

                <div className="flex items-end">
                  <button onClick={applyFilters}
                    className="w-full px-4 py-2 bg-[#00CC00] text-white rounded-xl text-sm hover:bg-[#00b300] transition-colors">
                    Применить
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Таблица */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {users.length === 0 ? (
              <div className="p-12 text-center text-gray-500">Пользователи не найдены</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Пользователь</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Роль</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Город</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Доп. информация</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Регистрация</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Статус</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-[#00CC00] flex items-center justify-center text-white text-sm font-bold shrink-0">
                                {user.firstName[0]}{user.lastName[0]}
                              </div>
                            )}
                            <div className="min-w-0">
                              <Link href={`/admin/users/${user.id}`} className="text-sm font-medium text-gray-900 hover:text-[#00CC00] truncate block">
                                {user.firstName} {user.lastName}
                              </Link>
                              <p className="text-xs text-gray-500 truncate">{user.email}</p>
                              <p className="text-xs text-gray-400 truncate">{user.phone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            user.role === 'volunteer' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {ROLE_LABELS[user.role] || user.role}
                          </span>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          <span className="text-sm text-gray-600">{user.city}</span>
                        </td>
                        <td className="px-5 py-4 hidden lg:table-cell">
                          {user.role === 'volunteer' && user.volunteerProfile && (
                            <div className="text-xs text-gray-600 space-y-0.5">
                              <p>Задач: <span className="font-medium">{user.volunteerProfile.completedTasks}</span></p>
                              <p>Проектов: <span className="font-medium">{user.volunteerProfile.completedProjects}</span></p>
                              <p>Рейтинг: <span className="font-medium">{Number(user.volunteerProfile.trustScore).toFixed(1)} ★</span></p>
                            </div>
                          )}
                          {user.role === 'organizer' && user.organizerProfile && (
                            <div className="text-xs text-gray-600 space-y-1">
                              <p className="font-medium truncate max-w-[160px]">{user.organizerProfile.organizationName}</p>
                              <div className="flex gap-1 flex-wrap">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  user.organizerProfile.isApprovedByAdmin ? 'bg-green-100 text-green-700' :
                                  user.organizerProfile.isRejected ? 'bg-red-100 text-red-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {user.organizerProfile.isApprovedByAdmin ? 'Подтверждён' :
                                   user.organizerProfile.isRejected ? 'Отклонён' : 'Ожидает'}
                                </span>
                                <span className="text-gray-400">· {user.organizerProfile.freePostsRemaining} пост.</span>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 hidden lg:table-cell">
                          <span className="text-sm text-gray-500">
                            {new Date(user.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            user.status === 'active' ? 'bg-green-100 text-green-700' :
                            user.status === 'blocked' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              user.status === 'active' ? 'bg-green-500' :
                              user.status === 'blocked' ? 'bg-red-500' : 'bg-gray-400'
                            }`} />
                            {STATUS_LABELS[user.status] || user.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          {user.status === 'blocked' ? (
                            <button onClick={() => setConfirmModal({ user, newStatus: 'active' })}
                              disabled={blockingId === user.id}
                              className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50">
                              Разблокировать
                            </button>
                          ) : (
                            <button onClick={() => setConfirmModal({ user, newStatus: 'blocked' })}
                              disabled={blockingId === user.id}
                              className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50">
                              Заблокировать
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {pages > 1 && (
              <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm text-gray-500">Страница {page} из {pages} · {total} пользователей</span>
                <div className="flex gap-2">
                  <button onClick={() => { const p = page - 1; setPage(p); fetchUsers(p); }} disabled={page === 1}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">←</button>
                  {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
                    const p = page <= 4 ? i + 1 : page - 3 + i;
                    if (p < 1 || p > pages) return null;
                    return (
                      <button key={p} onClick={() => { setPage(p); fetchUsers(p); }}
                        className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${p === page ? 'bg-[#00CC00] text-white border-[#00CC00]' : 'border-gray-200 hover:bg-gray-50'}`}>
                        {p}
                      </button>
                    );
                  })}
                  <button onClick={() => { const p = page + 1; setPage(p); fetchUsers(p); }} disabled={page === pages}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">→</button>
                </div>
              </div>
            )}
          </div>
        </DynamicContent>
      </div>

      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {confirmModal.newStatus === 'blocked' ? 'Заблокировать пользователя?' : 'Разблокировать пользователя?'}
            </h3>
            <p className="text-gray-600 text-sm mb-6">
              {confirmModal.newStatus === 'blocked'
                ? `${confirmModal.user.firstName} ${confirmModal.user.lastName} потеряет доступ к платформе.`
                : `${confirmModal.user.firstName} ${confirmModal.user.lastName} снова получит доступ.`}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(null)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                Отмена
              </button>
              <button onClick={handleStatusChange}
                className={`flex-1 px-4 py-2 rounded-xl text-sm text-white transition-colors ${
                  confirmModal.newStatus === 'blocked' ? 'bg-red-500 hover:bg-red-600' : 'bg-[#00CC00] hover:bg-[#00b300]'
                }`}>
                {confirmModal.newStatus === 'blocked' ? 'Заблокировать' : 'Разблокировать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarProvider>
  );
}
