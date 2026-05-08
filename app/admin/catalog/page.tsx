'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminNav from '../components/AdminNav';
import AdminSidebar from '../components/AdminSidebar';
import DynamicContent from '@/app/components/DynamicContent';
import { SidebarProvider } from '@/app/contexts/SidebarContext';
import { useToast } from '@/app/components/ToastContainer';

interface AdminUser { id: string; firstName: string; lastName: string; email: string; role: string; }

interface Translation { locale: string; name: string; description?: string; }
interface Category { id: string; slug: string; icon: string; translations: Translation[]; }
interface Skill { id: string; name: string; translations: Translation[]; }
interface Achievement {
  id: string; name: string; description: string; icon: string;
  conditionType: string; conditionValue: number; isActive: boolean;
  translations: Translation[];
}

type Tab = 'categories' | 'skills' | 'achievements';

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

export default function AdminCatalogPage() {
  const router = useRouter();
  const toast = useToast();
  const [me, setMe] = useState<AdminUser | null>(null);
  const [tab, setTab] = useState<Tab>('categories');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [categories, setCategories] = useState<Category[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  // Модалка
  const [modal, setModal] = useState<{ type: Tab; item?: any } | null>(null);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState<Record<string, boolean>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: Tab; id: string; name: string } | null>(null);

  // Форма категории
  const [catSlug, setCatSlug] = useState('');
  const [catIcon, setCatIcon] = useState('');
  const [catNameRu, setCatNameRu] = useState('');
  const [catNameKg, setCatNameKg] = useState('');

  // Форма навыка
  const [skillNameRu, setSkillNameRu] = useState('');
  const [skillNameKg, setSkillNameKg] = useState('');

  // Форма достижения
  const [achNameRu, setAchNameRu] = useState('');
  const [achNameKg, setAchNameKg] = useState('');
  const [achDescRu, setAchDescRu] = useState('');
  const [achDescKg, setAchDescKg] = useState('');
  const [achIcon, setAchIcon] = useState('🏆');
  const [achCondType, setAchCondType] = useState('projects_count');
  const [achCondValue, setAchCondValue] = useState(1);
  const [achActive, setAchActive] = useState(true);

  const fetchAll = useCallback(async () => {
    const [catRes, skillRes, achRes] = await Promise.all([
      fetch('/api/admin/categories'),
      fetch('/api/admin/skills'),
      fetch('/api/admin/achievements'),
    ]);
    if (catRes.ok) setCategories((await catRes.json()).categories);
    if (skillRes.ok) setSkills((await skillRes.json()).skills);
    if (achRes.ok) setAchievements((await achRes.json()).achievements);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) { router.push('/admin/login'); return; }
        const { user } = await meRes.json();
        if (user.role !== 'admin') { router.push('/'); return; }
        setMe(user);
        await fetchAll();
      } finally { setLoading(false); }
    };
    init();
  }, [router, fetchAll]);

  const translate = async (text: string, field: string, setter: (v: string) => void) => {
    if (!text.trim()) { toast.error('Введите текст на русском для перевода'); return; }
    setTranslating((p) => ({ ...p, [field]: true }));
    try {
      const res = await fetch('/api/admin/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, field }),
      });
      if (res.ok) { setter((await res.json()).translation); }
      else { toast.error('Ошибка перевода'); }
    } catch { toast.error('Ошибка сети'); }
    finally { setTranslating((p) => ({ ...p, [field]: false })); }
  };

  const openModal = (type: Tab, item?: any) => {
    setModal({ type, item });
    if (type === 'categories') {
      setCatSlug(item?.slug || '');
      setCatIcon(item?.icon || '');
      setCatNameRu(item?.translations?.find((t: Translation) => t.locale === 'ru')?.name || '');
      setCatNameKg(item?.translations?.find((t: Translation) => t.locale === 'kg')?.name || '');
    } else if (type === 'skills') {
      setSkillNameRu(item?.translations?.find((t: Translation) => t.locale === 'ru')?.name || item?.name || '');
      setSkillNameKg(item?.translations?.find((t: Translation) => t.locale === 'kg')?.name || '');
    } else {
      setAchNameRu(item?.translations?.find((t: Translation) => t.locale === 'ru')?.name || item?.name || '');
      setAchNameKg(item?.translations?.find((t: Translation) => t.locale === 'kg')?.name || '');
      setAchDescRu(item?.translations?.find((t: Translation) => t.locale === 'ru')?.description || item?.description || '');
      setAchDescKg(item?.translations?.find((t: Translation) => t.locale === 'kg')?.description || '');
      setAchIcon(item?.icon || '🏆');
      setAchCondType(item?.conditionType || 'projects_count');
      setAchCondValue(item?.conditionValue || 1);
      setAchActive(item?.isActive !== false);
    }
  };

  const handleSave = async () => {
    if (!modal) return;
    setSaving(true);
    try {
      const { type, item } = modal;
      const isEdit = !!item;
      let url = '';
      let body: any = {};

      if (type === 'categories') {
        url = isEdit ? `/api/admin/categories/${item.id}` : '/api/admin/categories';
        body = { slug: catSlug, icon: catIcon, nameRu: catNameRu, nameKg: catNameKg };
      } else if (type === 'skills') {
        url = isEdit ? `/api/admin/skills/${item.id}` : '/api/admin/skills';
        body = { nameRu: skillNameRu, nameKg: skillNameKg };
      } else {
        url = isEdit ? `/api/admin/achievements/${item.id}` : '/api/admin/achievements';
        body = { nameRu: achNameRu, nameKg: achNameKg, descRu: achDescRu, descKg: achDescKg, icon: achIcon, conditionType: achCondType, conditionValue: achCondValue, isActive: achActive };
      }

      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(isEdit ? 'Сохранено' : 'Создано');
        setModal(null);
        await fetchAll();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Ошибка сохранения');
      }
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const { type, id } = deleteConfirm;
    setDeleteConfirm(null);
    const urlMap: Record<Tab, string> = {
      categories: `/api/admin/categories/${id}`,
      skills: `/api/admin/skills/${id}`,
      achievements: `/api/admin/achievements/${id}`,
    };
    const res = await fetch(urlMap[type], { method: 'DELETE' });
    if (res.ok) { toast.success('Удалено'); fetchAll(); }
    else { toast.error((await res.json()).error || 'Ошибка'); }
  };

  const getName = (translations: Translation[], locale = 'ru') =>
    translations.find((t) => t.locale === locale)?.name || '—';

  // Фильтрация
  const q = search.toLowerCase();
  const filteredCategories = categories.filter((c) =>
    c.slug.includes(q) || getName(c.translations).toLowerCase().includes(q)
  );
  const filteredSkills = skills.filter((s) =>
    s.name.toLowerCase().includes(q) || getName(s.translations).toLowerCase().includes(q)
  );
  const filteredAchievements = achievements.filter((a) =>
    a.name.toLowerCase().includes(q) || getName(a.translations).toLowerCase().includes(q)
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00]" />
    </div>
  );

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'categories', label: 'Категории', count: categories.length },
    { key: 'skills', label: 'Навыки', count: skills.length },
    { key: 'achievements', label: 'Достижения', count: achievements.length },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50">
        {me && <><AdminNav user={me} /><AdminSidebar user={me} /></>}

        <DynamicContent>
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Каталог</h1>
            <p className="text-gray-500 mt-1 text-sm">Управление категориями, навыками и достижениями платформы</p>
          </div>

          {/* Вкладки */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4">
            <div className="flex border-b border-gray-100">
              {tabs.map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                    tab === t.key ? 'text-[#00CC00] border-b-2 border-[#00CC00] -mb-px' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {t.label}
                  <span className={`px-2 py-0.5 rounded-full text-xs ${tab === t.key ? 'bg-[#00CC00]/10 text-[#00CC00]' : 'bg-gray-100 text-gray-500'}`}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Панель поиска + кнопка */}
            <div className="px-5 py-3 flex gap-3 items-center border-b border-gray-50">
              <div className="flex-1 relative">
                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Поиск ${tab === 'categories' ? 'категорий' : tab === 'skills' ? 'навыков' : 'достижений'}...`}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00]" />
              </div>
              <button onClick={() => openModal(tab)}
                className="flex items-center gap-2 px-4 py-2 bg-[#00CC00] text-white rounded-xl text-sm hover:bg-[#00b300] transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Добавить
              </button>
            </div>

            {/* Список — Категории */}
            {tab === 'categories' && (
              <div className="divide-y divide-gray-50">
                {filteredCategories.length === 0 ? (
                  <div className="p-10 text-center text-gray-400 text-sm">Категории не найдены</div>
                ) : filteredCategories.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                    <span className="text-2xl w-10 text-center">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{getName(cat.translations, 'ru')}</p>
                      <p className="text-xs text-gray-400">{getName(cat.translations, 'kg')} · slug: {cat.slug}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openModal('categories', cat)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => setDeleteConfirm({ type: 'categories', id: cat.id, name: getName(cat.translations) })}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Список — Навыки */}
            {tab === 'skills' && (
              <div className="divide-y divide-gray-50">
                {filteredSkills.length === 0 ? (
                  <div className="p-10 text-center text-gray-400 text-sm">Навыки не найдены</div>
                ) : filteredSkills.map((skill) => (
                  <div key={skill.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{getName(skill.translations, 'ru') || skill.name}</p>
                      <p className="text-xs text-gray-400">{getName(skill.translations, 'kg')}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openModal('skills', skill)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => setDeleteConfirm({ type: 'skills', id: skill.id, name: skill.name })}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Список — Достижения */}
            {tab === 'achievements' && (
              <div className="divide-y divide-gray-50">
                {filteredAchievements.length === 0 ? (
                  <div className="p-10 text-center text-gray-400 text-sm">Достижения не найдены</div>
                ) : filteredAchievements.map((ach) => (
                  <div key={ach.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                    <span className="text-2xl w-10 text-center">{ach.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">{getName(ach.translations, 'ru') || ach.name}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ach.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {ach.isActive ? 'Активно' : 'Неактивно'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{getName(ach.translations, 'ru')?.length > 0 ? ach.description : ''}</p>
                      <p className="text-xs text-gray-400">{CONDITION_LABELS[ach.conditionType]} · {ach.conditionValue}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openModal('achievements', ach)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => setDeleteConfirm({ type: 'achievements', id: ach.id, name: ach.name })}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DynamicContent>
      </div>

      {/* Модалка создания/редактирования */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {modal.item ? 'Редактировать' : 'Добавить'}{' '}
                {modal.type === 'categories' ? 'категорию' : modal.type === 'skills' ? 'навык' : 'достижение'}
              </h3>
              <button onClick={() => setModal(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Форма категории */}
              {modal.type === 'categories' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Slug *</label>
                      <input value={catSlug} onChange={(e) => setCatSlug(e.target.value)}
                        placeholder="ecology" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00]" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Иконка (эмодзи) *</label>
                      <input value={catIcon} onChange={(e) => setCatIcon(e.target.value)}
                        placeholder="🌿" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00]" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Название (русский) *</label>
                    <input value={catNameRu} onChange={(e) => setCatNameRu(e.target.value)}
                      placeholder="Экология" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00]" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-gray-600">Название (кыргызский)</label>
                      <TranslateBtn onClick={() => translate(catNameRu, 'cat_name', setCatNameKg)} loading={!!translating['cat_name']} />
                    </div>
                    <input value={catNameKg} onChange={(e) => setCatNameKg(e.target.value)}
                      placeholder="Экология (кырг.)" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00]" />
                  </div>
                </>
              )}

              {/* Форма навыка */}
              {modal.type === 'skills' && (
                <>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Название (русский) *</label>
                    <input value={skillNameRu} onChange={(e) => setSkillNameRu(e.target.value)}
                      placeholder="Фотография" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00]" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-gray-600">Название (кыргызский)</label>
                      <TranslateBtn onClick={() => translate(skillNameRu, 'skill_name', setSkillNameKg)} loading={!!translating['skill_name']} />
                    </div>
                    <input value={skillNameKg} onChange={(e) => setSkillNameKg(e.target.value)}
                      placeholder="Сүрөт тартуу" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00]" />
                  </div>
                </>
              )}

              {/* Форма достижения */}
              {modal.type === 'achievements' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Иконка (эмодзи) *</label>
                      <input value={achIcon} onChange={(e) => setAchIcon(e.target.value)}
                        placeholder="🏆" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00]" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Активно</label>
                      <button type="button" onClick={() => setAchActive(!achActive)}
                        className={`w-full px-3 py-2 border rounded-xl text-sm transition-colors ${achActive ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                        {achActive ? '✓ Активно' : '✗ Неактивно'}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Условие *</label>
                      <select value={achCondType} onChange={(e) => setAchCondType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00]">
                        {Object.entries(CONDITION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Значение *</label>
                      <input type="number" min={1} value={achCondValue} onChange={(e) => setAchCondValue(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00]" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Название (рус) *</label>
                    <input value={achNameRu} onChange={(e) => setAchNameRu(e.target.value)}
                      placeholder="Эко-волонтёр" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00]" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Описание (рус) *</label>
                    <textarea value={achDescRu} onChange={(e) => setAchDescRu(e.target.value)} rows={2}
                      placeholder="Участвовал в 5 экологических проектах"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00] resize-none" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-gray-600">Название (кырг.)</label>
                      <TranslateBtn onClick={() => translate(achNameRu, 'ach_name', setAchNameKg)} loading={!!translating['ach_name']} />
                    </div>
                    <input value={achNameKg} onChange={(e) => setAchNameKg(e.target.value)}
                      placeholder="Эко-волонтёр (кырг.)" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00]" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-gray-600">Описание (кырг.)</label>
                      <TranslateBtn onClick={() => translate(achDescRu, 'ach_desc', setAchDescKg)} loading={!!translating['ach_desc']} />
                    </div>
                    <textarea value={achDescKg} onChange={(e) => setAchDescKg(e.target.value)} rows={2}
                      placeholder="Описание на кыргызском"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00] resize-none" />
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                Отмена
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 px-4 py-2 bg-[#00CC00] text-white rounded-xl text-sm hover:bg-[#00b300] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Подтверждение удаления */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Удалить «{deleteConfirm.name}»?</h3>
            <p className="text-gray-500 text-sm mb-6">Это действие нельзя отменить.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                Отмена
              </button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl text-sm hover:bg-red-600 transition-colors">
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarProvider>
  );
}
