'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminNav from '../components/AdminNav';
import AdminSidebar from '../components/AdminSidebar';
import { SidebarProvider, useSidebar } from '@/app/contexts/SidebarContext';
import { useToast } from '@/app/components/ToastContainer';
import { Tooltip } from '@/app/components/Tooltip';

interface CommentUser {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: string;
}

interface CommentProject {
  id: string;
  title: string;
}

interface Comment {
  id: string;
  text: string;
  createdAt: string;
  parentId: string | null;
  user: CommentUser;
  project: CommentProject;
  _count: { replies: number };
}

interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

function PageContent() {
  const router = useRouter();
  const toast = useToast();
  const { collapsed } = useSidebar();

  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Debounce: обновляем search через 400мс после последнего нажатия
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const [deleteTarget, setDeleteTarget] = useState<Comment | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Раскрытие текста длинных комментариев
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/comments?${params}`);
      if (!res.ok) { router.push('/admin/dashboard'); return; }
      const data = await res.json();
      setComments(data.comments);
      setTotal(data.total);
      setTodayCount(data.todayCount);
      setTotalPages(data.totalPages);
    } finally {
      setLoading(false);
    }
  }, [page, search, router]);

  useEffect(() => {
    const checkAdmin = async () => {
      const res = await fetch('/api/auth/me');
      if (!res.ok) { router.push('/admin/login'); return; }
      const data = await res.json();
      if (data.user.role !== 'admin') { router.push('/dashboard'); return; }
      setAdminUser(data.user);
    };
    checkAdmin();
  }, [router]);

  useEffect(() => {
    if (adminUser) loadComments();
  }, [adminUser, loadComments]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/comments?id=${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Ошибка при удалении'); return; }
      toast.success('Комментарий удалён');
      setDeleteTarget(null);
      await loadComments();
    } catch {
      toast.error('Ошибка при удалении');
    } finally {
      setDeleting(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return `Сегодня, ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (d.toDateString() === yesterday.toDateString()) {
      return `Вчера, ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getRoleBadge = (role: string) => {
    if (role === 'organizer') {
      return <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium">Орг.</span>;
    }
    return <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-medium">Вол.</span>;
  };

  if (!adminUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar user={adminUser} />
      <AdminNav user={adminUser} />

      <main className={`transition-all duration-300 pt-24 pb-10 px-4 sm:px-6 ${collapsed ? 'lg:ml-24' : 'lg:ml-72'}`}>
        <div className="max-w-6xl mx-auto">

          {/* Заголовок */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Управление комментариями</h1>
            <p className="text-sm text-gray-500 mt-1">Просматривайте и удаляйте комментарии пользователей</p>
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{total}</div>
                  <div className="text-xs text-gray-500">Всего комментариев</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{todayCount}</div>
                  <div className="text-xs text-gray-500">За сегодня</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 col-span-2 sm:col-span-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{totalPages}</div>
                  <div className="text-xs text-gray-500">Страниц</div>
                </div>
              </div>
            </div>
          </div>

          {/* Поиск */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Поиск по тексту, автору или проекту..."
                className="w-full pl-9 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-gray-300 hover:bg-gray-400 transition-colors"
                >
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Таблица комментариев */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#00CC00]" />
              </div>
            ) : comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-gray-500 font-medium">Комментарии не найдены</p>
                {search && <p className="text-gray-400 text-sm mt-1">Попробуйте изменить запрос</p>}
              </div>
            ) : (
              <>
                {/* Шапка таблицы */}
                <div className="hidden sm:grid grid-cols-[1fr_2fr_1.5fr_auto_auto] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <div>Автор</div>
                  <div>Комментарий</div>
                  <div>Проект</div>
                  <div>Дата</div>
                  <div></div>
                </div>

                <div className="divide-y divide-gray-50">
                  {comments.map((c) => {
                    const isExp = expanded.has(c.id);
                    const isLong = c.text.length > 120;
                    const displayText = isLong && !isExp ? c.text.slice(0, 120) + '…' : c.text;

                    return (
                      <div key={c.id} className={`px-5 py-4 hover:bg-gray-50 transition-colors ${c.parentId ? 'border-l-4 border-blue-200' : ''}`}>
                        {/* Mobile layout */}
                        <div className="sm:hidden space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {c.user.avatarUrl ? (
                                <img src={c.user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-[#00CC00] flex items-center justify-center text-white text-xs font-bold">
                                  {c.user.firstName[0]}{c.user.lastName[0]}
                                </div>
                              )}
                              <div>
                                <span className="text-sm font-medium text-gray-900">{c.user.firstName} {c.user.lastName}</span>
                                <span className="ml-1.5">{getRoleBadge(c.user.role)}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => setDeleteTarget(c)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                          <p className="text-sm text-gray-700">{displayText}</p>
                          {isLong && (
                            <button onClick={() => toggleExpand(c.id)} className="text-xs text-[#00CC00] hover:underline">
                              {isExp ? 'Свернуть' : 'Читать полностью'}
                            </button>
                          )}
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <Link href={`/volunteer/projects/${c.project.id}`} target="_blank" className="text-[#00CC00] hover:underline truncate max-w-[180px]">
                              {c.project.title}
                            </Link>
                            <span>{formatDate(c.createdAt)}</span>
                          </div>
                        </div>

                        {/* Desktop layout */}
                        <div className="hidden sm:grid grid-cols-[1fr_2fr_1.5fr_auto_auto] gap-4 items-start">
                          {/* Автор */}
                          <div className="flex items-center gap-2.5">
                            {c.user.avatarUrl ? (
                              <img src={c.user.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-[#00CC00] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {c.user.firstName[0]}{c.user.lastName[0]}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">{c.user.firstName} {c.user.lastName}</div>
                              <div className="mt-0.5">{getRoleBadge(c.user.role)}</div>
                            </div>
                          </div>

                          {/* Текст */}
                          <div>
                            {c.parentId && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-blue-500 font-medium mb-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                </svg>
                                Ответ
                              </span>
                            )}
                            <p className="text-sm text-gray-700 leading-relaxed">{displayText}</p>
                            {isLong && (
                              <button onClick={() => toggleExpand(c.id)} className="text-xs text-[#00CC00] hover:underline mt-1">
                                {isExp ? 'Свернуть' : 'Читать полностью'}
                              </button>
                            )}
                            {c._count.replies > 0 && (
                              <span className="inline-flex items-center gap-1 mt-1.5 text-xs text-gray-400">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                {c._count.replies} {c._count.replies === 1 ? 'ответ' : c._count.replies < 5 ? 'ответа' : 'ответов'}
                              </span>
                            )}
                          </div>

                          {/* Проект */}
                          <div className="min-w-0">
                            <Link
                              href={`/volunteer/projects/${c.project.id}`}
                              target="_blank"
                              className="text-sm text-[#00CC00] hover:text-[#00b300] hover:underline line-clamp-2 leading-snug"
                            >
                              {c.project.title}
                            </Link>
                          </div>

                          {/* Дата */}
                          <div className="text-xs text-gray-400 whitespace-nowrap pt-0.5">{formatDate(c.createdAt)}</div>

                          {/* Удалить */}
                          <div>
                            <Tooltip text="Удалить комментарий">
                              <button
                                onClick={() => setDeleteTarget(c)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Пагинация */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
                <span className="text-sm text-gray-500">
                  Страница {page} из {totalPages} · {total} комментариев
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Назад
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let p: number;
                    if (totalPages <= 5) p = i + 1;
                    else if (page <= 3) p = i + 1;
                    else if (page >= totalPages - 2) p = totalPages - 4 + i;
                    else p = page - 2 + i;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          page === p
                            ? 'bg-[#00CC00] text-white'
                            : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Далее →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Модал подтверждения удаления */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Удалить комментарий?</h3>
              <p className="text-sm text-gray-500 text-center mb-1">
                Автор: <span className="font-medium text-gray-700">{deleteTarget.user.firstName} {deleteTarget.user.lastName}</span>
              </p>
              {deleteTarget._count.replies > 0 && (
                <p className="text-xs text-orange-600 text-center bg-orange-50 rounded-lg px-3 py-2 mt-2 mb-1">
                  Вместе с ним будут удалены {deleteTarget._count.replies} {deleteTarget._count.replies === 1 ? 'ответ' : deleteTarget._count.replies < 5 ? 'ответа' : 'ответов'}
                </p>
              )}
              <div className="bg-gray-50 rounded-xl p-3 my-3 text-sm text-gray-700 italic line-clamp-3">
                «{deleteTarget.text}»
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-60"
                >
                  {deleting ? 'Удаление...' : 'Удалить'}
                </button>
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminCommentsPage() {
  return (
    <SidebarProvider>
      <PageContent />
    </SidebarProvider>
  );
}
