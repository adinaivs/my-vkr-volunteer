'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminNav from '../components/AdminNav';
import AdminSidebar from '../components/AdminSidebar';
import DynamicContent from '@/app/components/DynamicContent';
import { SidebarProvider } from '@/app/contexts/SidebarContext';
import { useToast } from '@/app/components/ToastContainer';
import { useTranslation } from '@/app/i18n/useTranslation';
import { IconPicker } from '../components/IconPicker';
import { SvgIcon } from '@/app/components/SvgIcon';
import { Tooltip } from '@/app/components/Tooltip';

interface AdminUser { id: string; firstName: string; lastName: string; email: string; role: string; avatarUrl?: string; }
interface Translation { locale: string; name: string; description?: string; }
interface Partner { id: string; name: string; logoUrl: string | null; isActive: boolean; }
interface Reward { id?: string; partnerId: string; rewardText: string; validForDays: number; isActive: boolean; partner?: Partner; }
interface Achievement {
  id: string; name: string; description: string; icon: string;
  conditionType: string; conditionValue: number; isActive: boolean;
  translations: Translation[];
  rewards: Reward[];
}

const CONDITION_LABELS: Record<string, string> = {
  projects_count: 'Кол-во проектов',
  category_projects_count: 'Проекты в категории',
  perfect_month: 'Идеальный месяц',
  organizer: 'Организатор',
};

function TranslateBtn({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50">
      {loading ? <div className="w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin" /> : '✨'}
      {loading ? 'Перевод...' : 'Перевести ИИ'}
    </button>
  );
}

const getName = (translations: Translation[], locale = 'ru') =>
  translations.find((t) => t.locale === locale)?.name || '—';

export default function AdminAchievementsPage() {
  const router = useRouter();
  const toast = useToast();
  const { t } = useTranslation('admin');
  const [me, setMe] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  const [modal, setModal] = useState<{ item?: Achievement } | null>(null);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState<Record<string, boolean>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);

  const [nameRu, setNameRu] = useState('');
  const [nameKg, setNameKg] = useState('');
  const [descRu, setDescRu] = useState('');
  const [descKg, setDescKg] = useState('');
  const [icon, setIcon] = useState('');
  const [condType, setCondType] = useState('projects_count');
  const [condValue, setCondValue] = useState(1);
  const [isActive, setIsActive] = useState(true);
  const [rewards, setRewards] = useState<{ partnerId: string; rewardText: string; validForDays: number }[]>([]);

  const fetchData = useCallback(async () => {
    const [achRes, partRes] = await Promise.all([
      fetch('/api/admin/achievements'),
      fetch('/api/admin/partners'),
    ]);
    if (achRes.ok) setAchievements((await achRes.json()).achievements);
    if (partRes.ok) setPartners((await partRes.json()).partners);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) { router.push('/admin/login'); return; }
        const { user } = await meRes.json();
        if (user.role !== 'admin') { router.push('/'); return; }
        setMe(user);
        await fetchData();
      } finally { setLoading(false); }
    };
    init();
  }, [router, fetchData]);

  const openModal = (item?: Achievement) => {
    setModal({ item });
    const ruT = item?.translations.find((t) => t.locale === 'ru');
    const kgT = item?.translations.find((t) => t.locale === 'kg');
    setNameRu(ruT?.name || item?.name || '');
    setNameKg(kgT?.name || '');
    setDescRu(ruT?.description || item?.description || '');
    setDescKg(kgT?.description || '');
    setIcon(item?.icon || '');
    setCondType(item?.conditionType || 'projects_count');
    setCondValue(item?.conditionValue || 1);
    setIsActive(item?.isActive !== false);
    setRewards(item?.rewards?.map(r => ({ partnerId: r.partnerId, rewardText: r.rewardText, validForDays: r.validForDays })) ?? []);
  };

  const addReward = () => setRewards(r => [...r, { partnerId: '', rewardText: '', validForDays: 30 }]);
  const removeReward = (i: number) => setRewards(r => r.filter((_, idx) => idx !== i));
  const updateReward = (i: number, field: string, value: string | number) =>
    setRewards(r => r.map((row, idx) => idx === i ? { ...row, [field]: value } : row));

  const handleTranslate = async (text: string, field: string, setter: (v: string) => void) => {
    if (!text.trim()) { toast.error('Введите текст на русском'); return; }
    setTranslating((p) => ({ ...p, [field]: true }));
    try {
      const res = await fetch('/api/admin/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (res.ok) setter((await res.json()).translation);
      else toast.error('Ошибка перевода');
    } catch { toast.error('Ошибка сети'); }
    finally { setTranslating((p) => ({ ...p, [field]: false })); }
  };

  const handleSave = async () => {
    if (!modal) return;
    setSaving(true);
    try {
      const isEdit = !!modal.item;
      const url = isEdit ? `/api/admin/achievements/${modal.item!.id}` : '/api/admin/achievements';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nameRu, nameKg, descRu, descKg, icon, conditionType: condType, conditionValue: condValue, isActive, rewards }),
      });
      if (res.ok) {
        toast.success(isEdit ? 'Сохранено' : 'Достижение создано');
        setModal(null);
        await fetchData();
      } else {
        toast.error((await res.json()).error || 'Ошибка');
      }
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const { id } = deleteConfirm;
    setDeleteConfirm(null);
    const res = await fetch(`/api/admin/achievements/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Удалено'); fetchData(); }
    else toast.error((await res.json()).error || 'Ошибка');
  };

  const filtered = achievements.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    getName(a.translations).toLowerCase().includes(search.toLowerCase())
  );

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
              <h1 className="text-3xl font-bold text-gray-900">{t.achievements?.title || 'Достижения'}</h1>
              <p className="text-gray-500 mt-1 text-sm">Управление достижениями и наградами волонтёров</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/admin/achievements/issued"
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                {t.achievements?.issued || 'Выданные достижения'}
              </Link>
              <button onClick={() => openModal()}
                className="flex items-center gap-2 px-4 py-2 bg-[#00CC00] text-white rounded-xl text-sm hover:bg-[#00b300] transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t.achievements?.createAchievement || 'Создать достижение'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <div className="relative">
                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск достижений..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00]" />
              </div>
            </div>

            <div className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <div className="p-10 text-center text-gray-400 text-sm">
                  {search ? 'Ничего не найдено' : (t.achievements?.noAchievements || 'Нет достижений')}
                </div>
              ) : filtered.map((ach) => (
                <div key={ach.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 flex items-center justify-center bg-amber-50 rounded-xl flex-shrink-0 text-amber-500">
                    <SvgIcon iconKey={ach.icon} className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900">{getName(ach.translations, 'ru') || ach.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ach.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {ach.isActive ? 'Активно' : 'Неактивно'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{ach.description}</p>
                    <p className="text-xs text-gray-400">
                      {CONDITION_LABELS[ach.conditionType] || ach.conditionType} · {ach.conditionValue}
                      {ach.rewards?.length > 0 && (
                        <span className="ml-2 text-amber-600 inline-flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                          </svg>
                          {ach.rewards.length} {ach.rewards.length === 1 ? 'награда' : ach.rewards.length < 5 ? 'награды' : 'наград'}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Tooltip text="Редактировать">
                      <button onClick={() => openModal(ach)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </Tooltip>
                    <Tooltip text="Удалить">
                      <button onClick={() => setDeleteConfirm({ id: ach.id, name: ach.name })}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DynamicContent>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {modal.item ? (t.achievements?.editAchievement || 'Редактировать') : (t.achievements?.createAchievement || 'Создать достижение')}
              </h3>
              <button onClick={() => setModal(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Иконка *</label>
                  <IconPicker value={icon} onChange={setIcon} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Статус</label>
                  <button type="button" onClick={() => setIsActive(!isActive)}
                    className={`w-full px-3 py-2 border rounded-xl text-sm transition-colors ${isActive ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                    <span className="flex items-center gap-1.5 justify-center">
                      {isActive ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      )}
                      {isActive ? 'Активно' : 'Неактивно'}
                    </span>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Условие *</label>
                  <select value={condType} onChange={(e) => setCondType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00]">
                    {Object.entries(CONDITION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Значение *</label>
                  <input type="number" min={1} value={condValue} onChange={(e) => setCondValue(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00]" />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Русский язык</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Название *</label>
                    <input value={nameRu} onChange={(e) => setNameRu(e.target.value)}
                      placeholder="Эко-волонтёр"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00]" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Описание *</label>
                    <textarea value={descRu} onChange={(e) => setDescRu(e.target.value)} rows={2}
                      placeholder="Участвовал в 5 экологических проектах"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00] resize-none" />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Кыргызский язык</p>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-gray-600">Название</label>
                      <TranslateBtn onClick={() => handleTranslate(nameRu, 'name', setNameKg)} loading={!!translating['name']} />
                    </div>
                    <input value={nameKg} onChange={(e) => setNameKg(e.target.value)}
                      placeholder="Название на кыргызском"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00]" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-gray-600">Описание</label>
                      <TranslateBtn onClick={() => handleTranslate(descRu, 'desc', setDescKg)} loading={!!translating['desc']} />
                    </div>
                    <textarea value={descKg} onChange={(e) => setDescKg(e.target.value)} rows={2}
                      placeholder="Описание на кыргызском"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00] resize-none" />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Награды от партнёров</p>
                  <button type="button" onClick={addReward}
                    disabled={partners.length === 0}
                    className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 border border-gray-200 rounded-lg text-xs hover:bg-gray-200 transition-colors disabled:opacity-40">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Добавить
                  </button>
                </div>
                {partners.length === 0 && (
                  <p className="text-xs text-gray-400 italic">Сначала добавьте партнёров в разделе «Партнёры»</p>
                )}
                <div className="space-y-4">
                  {rewards.map((r, i) => (
                    <div key={i} className="space-y-2">
                      {i > 0 && <div className="border-t border-gray-100" />}
                      <div className="flex items-center gap-2">
                        <select
                          value={r.partnerId}
                          onChange={e => updateReward(i, 'partnerId', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00]"
                        >
                          <option value="">Выберите партнёра...</option>
                          {partners.filter(p => p.isActive).map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <button onClick={() => removeReward(i)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <input
                        value={r.rewardText}
                        onChange={e => updateReward(i, 'rewardText', e.target.value)}
                        placeholder="Описание награды, напр. «Скидка 15% на заказ»"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00]"
                      />
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Действует дней:</label>
                        <input
                          type="number" min={1} max={365}
                          value={r.validForDays}
                          onChange={e => updateReward(i, 'validForDays', parseInt(e.target.value) || 30)}
                          className="w-24 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                {t.common?.cancel || 'Отмена'}
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 px-4 py-2 bg-[#00CC00] text-white rounded-xl text-sm hover:bg-[#00b300] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {saving ? 'Сохранение...' : (t.common?.save || 'Сохранить')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.achievements?.deleteConfirm || 'Удалить это достижение?'} «{deleteConfirm.name}»?</h3>
            <p className="text-gray-500 text-sm mb-6">Это действие нельзя отменить.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                {t.common?.cancel || 'Отмена'}
              </button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl text-sm hover:bg-red-600 transition-colors">
                {t.common?.delete || 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarProvider>
  );
}
