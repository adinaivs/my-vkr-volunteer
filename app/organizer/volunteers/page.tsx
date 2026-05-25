'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import OrganizerNav from '../components/OrganizerNav';
import OrganizerSidebar from '../components/OrganizerSidebar';
import AiSupportButton from '@/app/components/AiSupportButton';
import DynamicContent from '@/app/components/DynamicContent';
import { SidebarProvider } from '@/app/contexts/SidebarContext';
import { useTranslation } from '@/app/i18n/useTranslation';
import { Tooltip } from '@/app/components/Tooltip';
import CustomSelect from '@/app/components/CustomSelect';
import { SvgIcon } from '@/app/components/SvgIcon';

/* ─── Types ─────────────────────────────────────────────────────────── */

interface User { id: string; firstName: string; lastName: string; avatarUrl?: string }

interface VolunteerShort {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  city: string;
  volunteerProfile?: { bio?: string; trustScore: number; completedTasks: number; completedProjects: number };
  skills: { id: string; name: string }[];
}

interface ProjectEntry {
  id: string; title: string; status: string; startDate?: string; endDate?: string;
  isActive: boolean; joinedAt: string; categoryName: string;
}
interface AchievementEntry {
  id: string; createdAt: string; expiresAt: string;
  achievement: { id: string; icon: string; name: string; description: string };
}
interface RatingEntry { score: number; feedback?: string; createdAt: string; taskTitle: string; projectTitle: string }

interface VolunteerDetail extends VolunteerShort {
  createdAt: string;
  projects: ProjectEntry[];
  achievements: AchievementEntry[];
  ratings: RatingEntry[];
}

/* ─── Helpers ────────────────────────────────────────────────────────── */

const PROJECT_STATUS: Record<string, { label: string; color: string }> = {
  recruiting: { label: 'Набор', color: 'bg-blue-100 text-blue-700' },
  upcoming:   { label: 'Скоро', color: 'bg-purple-100 text-purple-700' },
  active:     { label: 'Активен', color: 'bg-green-100 text-green-700' },
  completed:  { label: 'Завершён', color: 'bg-gray-100 text-gray-600' },
  cancelled:  { label: 'Отменён', color: 'bg-red-100 text-red-600' },
};

function Avatar({ user, size = 'md' }: { user: { firstName: string; lastName?: string; avatarUrl?: string }; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'w-16 h-16 text-xl' : size === 'md' ? 'w-12 h-12 text-base' : 'w-9 h-9 text-sm';
  if (user.avatarUrl) return <img src={user.avatarUrl} alt="" className={`${cls} rounded-full object-cover shrink-0`} />;
  return (
    <div className={`${cls} rounded-full bg-gradient-to-br from-[#00CC00] to-emerald-500 flex items-center justify-center text-white font-bold shrink-0`}>
      {user.firstName[0]}{user.lastName?.[0] ?? ''}
    </div>
  );
}

function Stars({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <svg key={s} className={`w-3.5 h-3.5 ${s <= score ? 'text-amber-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

const fmtDate = (d?: string | Date) =>
  d ? new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/* ─── Page ───────────────────────────────────────────────────────────── */

export default function OrganizerVolunteers() {
  const router = useRouter();
  const { t } = useTranslation('organizer');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [volunteers, setVolunteers] = useState<VolunteerShort[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'rating-desc' | 'projects-desc' | 'tasks-desc'>('name-asc');
  const [filterCity, setFilterCity] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Profile drawer
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<VolunteerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) { router.push('/login'); return; }
        const { user: me } = await res.json();
        if (me.role !== 'organizer') { router.push('/dashboard'); return; }
        setUser(me);
        const vRes = await fetch('/api/volunteers');
        if (vRes.ok) setVolunteers((await vRes.json()).volunteers ?? []);
      } catch { router.push('/login'); }
      finally { setLoading(false); }
    };
    init();
  }, [router]);

  const openProfile = async (id: string) => {
    setSelectedId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/volunteers/${id}`);
      if (res.ok) setDetail((await res.json()).volunteer);
    } finally { setDetailLoading(false); }
  };

  const closeProfile = () => { setSelectedId(null); setDetail(null); };

  const handleStartChat = async (volunteerId: string) => {
    console.log('[handleStartChat] Начало, volunteerId:', volunteerId);
    setCreatingChat(true);
    try {
      console.log('[handleStartChat] Отправка запроса на /api/direct-chats');
      const res = await fetch('/api/direct-chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otherUserId: volunteerId }),
      });

      console.log('[handleStartChat] Ответ получен, status:', res.status);

      if (res.ok) {
        const data = await res.json();
        console.log('[handleStartChat] Данные:', data);
        const { chatId } = data;
        console.log('[handleStartChat] Переход на чат:', chatId);
        router.push(`/organizer/chats/direct-${chatId}`);
      } else {
        const errorData = await res.json();
        console.error('[handleStartChat] Ошибка от сервера:', errorData);
        alert(`Ошибка: ${errorData.error || 'Неизвестная ошибка'}\n${errorData.details || ''}`);
      }
    } catch (error) {
      console.error('[handleStartChat] Исключение:', error);
      alert(`Ошибка при создании чата: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setCreatingChat(false);
    }
  };

  useEffect(() => {
    document.body.style.overflow = selectedId ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [selectedId]);

  // Distinct cities for filter
  const cities = useMemo(() => {
    const s = new Set(volunteers.map(v => v.city).filter(Boolean));
    return Array.from(s).sort();
  }, [volunteers]);

  const filtered = useMemo(() => {
    let list = [...volunteers];
    const q = search.toLowerCase();
    if (q) {
      list = list.filter(v =>
        v.firstName.toLowerCase().includes(q) ||
        v.lastName.toLowerCase().includes(q) ||
        (v.city ?? '').toLowerCase().includes(q) ||
        v.skills.some(s => s.name.toLowerCase().includes(q))
      );
    }
    if (filterCity !== 'all') list = list.filter(v => v.city === filterCity);
    list.sort((a, b) => {
      const ap = a.volunteerProfile, bp = b.volunteerProfile;
      if (sortBy === 'name-asc') return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      if (sortBy === 'name-desc') return `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`);
      if (sortBy === 'rating-desc') return Number(bp?.trustScore ?? 0) - Number(ap?.trustScore ?? 0);
      if (sortBy === 'projects-desc') return (bp?.completedProjects ?? 0) - (ap?.completedProjects ?? 0);
      if (sortBy === 'tasks-desc') return (bp?.completedTasks ?? 0) - (ap?.completedTasks ?? 0);
      return 0;
    });
    return list;
  }, [volunteers, search, filterCity, sortBy]);

  const resetFilters = () => { setSearch(''); setFilterCity('all'); setSortBy('name-asc'); };
  const hasFilters = search || filterCity !== 'all' || sortBy !== 'name-asc';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00]" />
    </div>
  );
  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50">
        <OrganizerSidebar user={user} />
        <OrganizerNav user={user} />

        <DynamicContent>
          {/* Header */}
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t.volunteers?.title || 'Волонтёры'}</h1>
              <p className="text-gray-500 mt-1 text-sm">Всего: {volunteers.length}</p>
            </div>
          </div>

          {/* Search + controls */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-4">
            <div className="flex gap-3 items-center">
              {/* Search */}
              <div className="relative flex-1">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder={t.volunteers?.searchPlaceholder || 'Поиск по имени, городу или навыкам...'}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Filters toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                  showFilters || hasFilters ? 'bg-[#00CC00] text-white border-[#00CC00]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                </svg>
                {t.common?.filter || 'Фильтры'}
                {hasFilters && <span className="w-2 h-2 bg-white rounded-full opacity-80" />}
              </button>

              {/* View mode — одна кнопка-тогл */}
              <Tooltip text={viewMode === 'grid' ? 'Переключить на список' : 'Переключить на блоки'}>
                <button
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  className="p-2.5 rounded-xl border bg-[#00CC00] text-white border-[#00CC00] transition-colors hover:bg-[#00b300]"
                >
                  {viewMode === 'list' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  )}
                </button>
              </Tooltip>

              {/* Reset — только при активных фильтрах */}
              {hasFilters && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="hidden sm:inline">Сбросить</span>
                </button>
              )}
            </div>

            {/* Expanded filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* City */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">{t.volunteers?.city || 'Город'}</label>
                  <CustomSelect
                    value={filterCity}
                    onChange={setFilterCity}
                    placeholder="Все города"
                    options={[
                      { value: 'all', label: 'Все города' },
                      ...cities.map(c => ({ value: c, label: c })),
                    ]}
                  />
                </div>

                {/* Sort */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Сортировка</label>
                  <CustomSelect
                    value={sortBy}
                    onChange={v => setSortBy(v as typeof sortBy)}
                    placeholder="Сортировка"
                    options={[
                      { value: 'name-asc', label: 'Имя: А → Я' },
                      { value: 'name-desc', label: 'Имя: Я → А' },
                      { value: 'rating-desc', label: 'Рейтинг: высокий' },
                      { value: 'projects-desc', label: 'Проектов: больше' },
                      { value: 'tasks-desc', label: 'Задач: больше' },
                    ]}
                  />
                </div>

                {/* Stats hint */}
                <div className="flex items-end">
                  <div className="w-full bg-green-50 rounded-xl px-4 py-2.5 border border-green-100 text-sm text-green-700">
                    Найдено: <span className="font-semibold">{filtered.length}</span> из {volunteers.length}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {hasFilters ? 'Ничего не найдено' : (t.volunteers?.noParticipants || 'Нет волонтёров')}
              </h3>
              <p className="text-gray-500 text-sm mb-4">
                {hasFilters ? 'Попробуйте изменить параметры поиска' : (t.volunteers?.noParticipantsHint || 'Волонтёры появятся после регистрации на платформе')}
              </p>
              {hasFilters && (
                <button onClick={resetFilters} className="px-4 py-2 bg-[#00CC00] text-white rounded-xl text-sm font-medium hover:bg-[#00b300] transition-colors">
                  Сбросить фильтры
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(v => (
                <button
                  key={v.id}
                  onClick={() => openProfile(v.id)}
                  className={`text-left bg-white rounded-2xl border p-4 hover:shadow-md hover:border-[#00CC00] transition-all group ${
                    selectedId === v.id ? 'border-[#00CC00] shadow-md ring-1 ring-[#00CC00]/30' : 'border-gray-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar user={v} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate group-hover:text-[#00CC00] transition-colors">
                        {v.firstName} {v.lastName}
                      </p>
                      <p className="text-xs text-gray-400">{v.city || '—'}</p>
                    </div>
                    <svg className="w-4 h-4 text-gray-300 group-hover:text-[#00CC00] transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  {v.volunteerProfile && (
                    <div className="grid grid-cols-3 gap-2 mb-3 text-center border-t border-gray-50 pt-3">
                      <div>
                        <p className="text-base font-bold text-[#00CC00]">{v.volunteerProfile.completedProjects}</p>
                        <p className="text-xs text-gray-400">Проектов</p>
                      </div>
                      <div>
                        <p className="text-base font-bold text-[#00CC00]">{v.volunteerProfile.completedTasks}</p>
                        <p className="text-xs text-gray-400">Задач</p>
                      </div>
                      <div>
                        <p className="text-base font-bold text-[#00CC00]">{Number(v.volunteerProfile.trustScore).toFixed(1)}</p>
                        <p className="text-xs text-gray-400">Рейтинг</p>
                      </div>
                    </div>
                  )}
                  {v.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {v.skills.slice(0, 3).map(s => (
                        <span key={s.id} className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full border border-green-100">{s.name}</span>
                      ))}
                      {v.skills.length > 3 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">+{v.skills.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {filtered.map((v, i) => (
                <button
                  key={v.id}
                  onClick={() => openProfile(v.id)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors group ${
                    i !== filtered.length - 1 ? 'border-b border-gray-50' : ''
                  } ${selectedId === v.id ? 'bg-green-50' : ''}`}
                >
                  <Avatar user={v} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 group-hover:text-[#00CC00] transition-colors">
                      {v.firstName} {v.lastName}
                    </p>
                    <p className="text-xs text-gray-400">{v.city || '—'}</p>
                  </div>
                  {v.volunteerProfile && (
                    <div className="hidden sm:flex gap-6 text-center">
                      <div>
                        <p className="text-sm font-bold text-[#00CC00]">{v.volunteerProfile.completedProjects}</p>
                        <p className="text-xs text-gray-400">Проектов</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#00CC00]">{v.volunteerProfile.completedTasks}</p>
                        <p className="text-xs text-gray-400">Задач</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#00CC00]">{Number(v.volunteerProfile.trustScore).toFixed(1)}</p>
                        <p className="text-xs text-gray-400">Рейтинг</p>
                      </div>
                    </div>
                  )}
                  {v.skills.length > 0 && (
                    <div className="hidden md:flex flex-wrap gap-1 max-w-[200px]">
                      {v.skills.slice(0, 2).map(s => (
                        <span key={s.id} className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full border border-green-100">{s.name}</span>
                      ))}
                      {v.skills.length > 2 && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">+{v.skills.length - 2}</span>}
                    </div>
                  )}
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-[#00CC00] transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </DynamicContent>

        {/* ── Profile Drawer ── */}
        {selectedId && (
          <>
            <div className="fixed inset-0 bg-black/40 z-40" onClick={closeProfile} />
            <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-white z-50 shadow-2xl flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                <h2 className="text-lg font-bold text-gray-900">{t.volunteers?.title || 'Профиль волонтёра'}</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => detail && handleStartChat(detail.id)}
                    disabled={creatingChat}
                    className="flex items-center gap-2 px-4 py-2 bg-[#00CC00] text-white rounded-xl text-sm font-medium hover:bg-[#00b300] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {creatingChat ? (t.common?.loading || 'Загрузка...') : 'Написать'}
                  </button>
                  <button onClick={closeProfile} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {detailLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#00CC00]" />
                </div>
              ) : detail ? (
                <div className="flex-1 overflow-y-auto">
                  {/* Hero */}
                  <div className="px-6 py-6 bg-gradient-to-br from-green-50 to-emerald-50 border-b border-gray-100">
                    <div className="flex items-center gap-4 mb-4">
                      <Avatar user={detail} size="lg" />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-gray-900">{detail.firstName} {detail.lastName}</h3>
                        <p className="text-sm text-gray-500">{detail.city || '—'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">На платформе с {fmtDate(detail.createdAt)}</p>
                      </div>
                    </div>
                    {detail.volunteerProfile && (
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { val: detail.volunteerProfile.completedProjects, label: 'Проектов' },
                          { val: detail.volunteerProfile.completedTasks, label: 'Задач' },
                          { val: Number(detail.volunteerProfile.trustScore).toFixed(1), label: 'Рейтинг' },
                        ].map(({ val, label }) => (
                          <div key={label} className="bg-white rounded-xl p-3 text-center shadow-sm border border-green-100">
                            <p className="text-2xl font-bold text-[#00CC00]">{val}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="px-6 py-5 space-y-6">
                    {/* Bio */}
                    {detail.volunteerProfile?.bio && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">О себе</h4>
                        <p className="text-sm text-gray-700 leading-relaxed">{detail.volunteerProfile.bio}</p>
                      </div>
                    )}

                    {/* Contacts */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Контакты</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                            <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <span className="text-gray-700">{detail.email}</span>
                        </div>
                        {detail.phone && (
                          <div className="flex items-center gap-3 text-sm">
                            <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                              <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                            </div>
                            <span className="text-gray-700">{detail.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Skills */}
                    {detail.skills.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Навыки</h4>
                        <div className="flex flex-wrap gap-2">
                          {detail.skills.map(s => (
                            <span key={s.id} className="px-3 py-1 bg-green-50 text-green-700 text-sm rounded-full border border-green-100">{s.name}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Projects */}
                    {detail.projects.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                          Проекты ({detail.projects.length})
                        </h4>
                        <div className="space-y-2">
                          {detail.projects.map(p => {
                            const st = PROJECT_STATUS[p.status] ?? { label: p.status, color: 'bg-gray-100 text-gray-600' };
                            return (
                              <div key={p.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <p className="text-sm font-semibold text-gray-900 leading-snug">{p.title}</p>
                                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 font-medium ${st.color}`}>{st.label}</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-400">
                                  {p.categoryName && <span className="text-gray-500">{p.categoryName}</span>}
                                  <span>{fmtDate(p.startDate)} — {fmtDate(p.endDate)}</span>
                                </div>
                                <div className="mt-1 text-xs">
                                  <span className={p.isActive ? 'text-green-600 font-medium' : 'text-gray-400'}>
                                    {p.isActive ? '● Активный участник' : '○ Завершил участие'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Achievements */}
                    {detail.achievements.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                          Достижения ({detail.achievements.length})
                        </h4>
                        <div className="space-y-2">
                          {detail.achievements.map(ua => {
                            const expired = new Date(ua.expiresAt) <= new Date();
                            return (
                              <div key={ua.id} className={`flex items-center gap-3 p-3 rounded-xl border ${expired ? 'opacity-50 bg-gray-50 border-gray-100' : 'bg-amber-50 border-amber-100'}`}>
                                <div className={`w-9 h-9 flex items-center justify-center rounded-xl shrink-0 overflow-hidden ${expired ? 'bg-gray-100 text-gray-400' : 'bg-amber-100 text-amber-600'}`}>
                                  <SvgIcon iconKey={ua.achievement.icon} className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-900">{ua.achievement.name}</p>
                                  <p className="text-xs text-gray-500 truncate">{ua.achievement.description}</p>
                                </div>
                                <span className={`text-xs font-medium shrink-0 ${expired ? 'text-gray-400' : 'text-green-600'}`}>
                                  {expired ? 'Истёк' : 'Активно'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Ratings */}
                    {detail.ratings.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Последние оценки</h4>
                        <div className="space-y-2">
                          {detail.ratings.map((r, i) => (
                            <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                              <div className="flex items-center justify-between mb-1">
                                <Stars score={r.score} />
                                <span className="text-xs text-gray-400">{fmtDate(r.createdAt)}</span>
                              </div>
                              <p className="text-xs text-gray-500 font-medium">{r.projectTitle} — {r.taskTitle}</p>
                              {r.feedback && <p className="text-xs text-gray-600 mt-1 italic">«{r.feedback}»</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="h-4" />
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">Не удалось загрузить профиль</p>
                  <button onClick={() => openProfile(selectedId)} className="mt-3 text-xs text-[#00CC00] hover:underline">
                    Попробовать снова
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        <AiSupportButton />
      </div>
    </SidebarProvider>
  );
}
