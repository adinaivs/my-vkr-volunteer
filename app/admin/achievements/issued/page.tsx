'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminNav from '../../components/AdminNav';
import AdminSidebar from '../../components/AdminSidebar';
import DynamicContent from '@/app/components/DynamicContent';
import { SidebarProvider } from '@/app/contexts/SidebarContext';
import { useToast } from '@/app/components/ToastContainer';
import { useTranslation } from '@/app/i18n/useTranslation';

interface AdminUser { id: string; firstName: string; lastName: string; email: string; role: string; avatarUrl?: string; }

export default function AdminIssuedAchievementsPage() {
  const router = useRouter();
  const toast = useToast();
  const { t } = useTranslation('admin');
  const [me, setMe] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [issued, setIssued] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [users, setUsers] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [selUserId, setSelUserId] = useState('');
  const [selAchId, setSelAchId] = useState('');
  const [rewardText, setRewardText] = useState('');
  const [validDays, setValidDays] = useState(365);

  const [userSearch, setUserSearch] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);

  const fetchIssued = useCallback(async (q = '') => {
    const res = await fetch(`/api/admin/achievements/issued?search=${encodeURIComponent(q)}`);
    if (res.ok) setIssued((await res.json()).issued);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) { router.push('/admin/login'); return; }
        const { user } = await meRes.json();
        if (user.role !== 'admin') { router.push('/'); return; }
        setMe(user);
        await fetchIssued();
        const [achRes, usersRes] = await Promise.all([
          fetch('/api/admin/achievements'),
          fetch('/api/admin/users?limit=200'),
        ]);
        if (achRes.ok) setAchievements((await achRes.json()).achievements);
        if (usersRes.ok) setUsers((await usersRes.json()).users);
      } finally { setLoading(false); }
    };
    init();
  }, [router, fetchIssued]);

  useEffect(() => {
    const q = userSearch.toLowerCase();
    setFilteredUsers(q
      ? users.filter((u) => `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q))
      : users.slice(0, 20)
    );
  }, [userSearch, users]);

  const handleSearch = (v: string) => {
    setSearch(v);
    const t = setTimeout(() => fetchIssued(v), 300);
    return () => clearTimeout(t);
  };

  const handleIssue = async () => {
    if (!selUserId || !selAchId) { toast.error(t.achievements?.selectUserAndAchievement || 'Выберите пользователя и достижение'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/achievements/issued', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selUserId, achievementId: selAchId, rewardText, validDays }),
      });
      if (res.ok) {
        toast.success(t.achievements?.issueSuccess || 'Достижение выдано');
        setModal(false);
        setSelUserId(''); setSelAchId(''); setRewardText(''); setValidDays(365); setUserSearch('');
        await fetchIssued(search);
      } else {
        toast.error((await res.json()).error || 'Ошибка');
      }
    } finally { setSaving(false); }
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
  const isExpired = (d: string) => new Date(d) < new Date();

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
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <Link href="/admin/achievements" className="hover:text-[#00CC00]">{t.achievements?.title || 'Достижения'}</Link>
                <span>/</span>
                <span className="text-gray-800">{t.achievements?.issuedBreadcrumb || 'Выданные'}</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">{t.achievements?.issuedTitle || 'Выданные достижения'}</h1>
              <p className="text-gray-500 mt-1 text-sm">{t.achievements?.issuedSubtitle || 'История наград волонтёров платформы'}</p>
            </div>
            <button onClick={() => setModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#00CC00] text-white rounded-xl text-sm hover:bg-[#00b300] transition-colors shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t.achievements?.issueManually || 'Выдать вручную'}
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <div className="relative">
                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input type="text" value={search} onChange={(e) => handleSearch(e.target.value)}
                  placeholder={t.achievements?.issuedSearchPlaceholder || 'Поиск по имени пользователя или достижению...'}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00]" />
              </div>
            </div>

            {issued.length === 0 ? (
              <div className="p-10 text-center text-gray-400 text-sm">
                {search ? (t.achievements?.noIssuedSearch || 'Ничего не найдено') : (t.achievements?.noIssued || 'Достижений не выдано')}
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {issued.map((ua: any) => {
                  const achName = ua.achievement.translations?.find((tr: any) => tr.locale === 'ru')?.name || ua.achievement.name;
                  const expired = isExpired(ua.expiresAt);
                  return (
                    <div key={ua.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                      <span className="text-2xl w-10 text-center">{ua.achievement.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{achName}</p>
                        <p className="text-xs text-gray-400">{ua.achievement.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <Link href={`/admin/users/${ua.user.id}`} className="text-sm font-medium text-gray-700 hover:text-[#00CC00]">
                          {ua.user.firstName} {ua.user.lastName}
                        </Link>
                        <p className="text-xs text-gray-400">{ua.user.email}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-500">{t.achievements?.issuedAtLabel || 'Выдано'} {fmt(ua.createdAt)}</p>
                        <p className={`text-xs ${expired ? 'text-red-500' : 'text-gray-400'}`}>
                          {expired ? (t.achievements?.expiredLabel || 'Истёк') : (t.achievements?.validUntilLabel || 'До')} {fmt(ua.expiresAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DynamicContent>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">{t.achievements?.issueModalTitle || 'Выдать достижение вручную'}</h3>
              <button onClick={() => setModal(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">{t.achievements?.userLabel || 'Пользователь *'}</label>
                <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                  placeholder={t.achievements?.userSearchPlaceholder || 'Поиск по имени или email...'}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00] mb-1" />
                {filteredUsers.length > 0 && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                    {filteredUsers.map((u) => (
                      <button key={u.id} type="button" onClick={() => { setSelUserId(u.id); setUserSearch(`${u.firstName} ${u.lastName}`); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${selUserId === u.id ? 'bg-green-50 text-[#00CC00]' : ''}`}>
                        <span className="font-medium">{u.firstName} {u.lastName}</span>
                        <span className="text-gray-400 text-xs">{u.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">{t.achievements?.achievementLabel || 'Достижение *'}</label>
                <select value={selAchId} onChange={(e) => setSelAchId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00]">
                  <option value="">{t.achievements?.selectAchievementOption || '— Выберите достижение —'}</option>
                  {achievements.map((a: any) => {
                    const name = a.translations?.find((tr: any) => tr.locale === 'ru')?.name || a.name;
                    return <option key={a.id} value={a.id}>{a.icon} {name}</option>;
                  })}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">{t.achievements?.rewardTextLabel || 'Текст награды'}</label>
                <input value={rewardText} onChange={(e) => setRewardText(e.target.value)}
                  placeholder={t.achievements?.rewardTextPlaceholder || 'Необязательно — описание награды'}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00]" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">{t.achievements?.validDaysLabel || 'Срок действия (дней)'}</label>
                <input type="number" min={1} value={validDays} onChange={(e) => setValidDays(parseInt(e.target.value) || 365)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00]" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={() => setModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">
                {t.achievements?.cancelBtn || 'Отмена'}
              </button>
              <button onClick={handleIssue} disabled={saving}
                className="flex-1 px-4 py-2 bg-[#00CC00] text-white rounded-xl text-sm hover:bg-[#00b300] disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {saving ? (t.achievements?.issuingBtn || 'Выдача...') : (t.achievements?.issueBtn || 'Выдать')}
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarProvider>
  );
}
