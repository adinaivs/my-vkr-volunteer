'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
interface Translation { locale: string; name: string; }
interface Category { id: string; slug: string; icon: string; translations: Translation[]; }

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

export default function AdminCategoriesPage() {
  const router = useRouter();
  const toast = useToast();
  const { t } = useTranslation('admin');
  const [me, setMe] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);

  const [modal, setModal] = useState<{ item?: Category } | null>(null);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  const [slug, setSlug] = useState('');
  const [icon, setIcon] = useState('');
  const [nameRu, setNameRu] = useState('');
  const [nameKg, setNameKg] = useState('');

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/admin/categories');
    if (res.ok) setCategories((await res.json()).categories);
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

  const openModal = (item?: Category) => {
    setModal({ item });
    setSlug(item?.slug || '');
    setIcon(item?.icon || '');
    setNameRu(item?.translations.find((t) => t.locale === 'ru')?.name || '');
    setNameKg(item?.translations.find((t) => t.locale === 'kg')?.name || '');
  };

  const handleTranslate = async () => {
    if (!nameRu.trim()) { toast.error('Введите название на русском'); return; }
    setTranslating(true);
    try {
      const res = await fetch('/api/admin/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: nameRu }),
      });
      if (res.ok) setNameKg((await res.json()).translation);
      else toast.error('Ошибка перевода');
    } catch { toast.error('Ошибка сети'); }
    finally { setTranslating(false); }
  };

  const handleSave = async () => {
    if (!modal) return;
    setSaving(true);
    try {
      const isEdit = !!modal.item;
      const url = isEdit ? `/api/admin/categories/${modal.item!.id}` : '/api/admin/categories';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, icon, nameRu, nameKg }),
      });
      if (res.ok) {
        toast.success(isEdit ? 'Сохранено' : 'Категория создана');
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
    const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Удалено'); fetchData(); }
    else toast.error((await res.json()).error || 'Ошибка');
  };

  const filtered = categories.filter((c) =>
    c.slug.toLowerCase().includes(search.toLowerCase()) ||
    getName(c.translations).toLowerCase().includes(search.toLowerCase())
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
              <h1 className="text-3xl font-bold text-gray-900">{t.categories?.title || 'Категории'}</h1>
              <p className="text-gray-500 mt-1 text-sm">Управление категориями проектов</p>
            </div>
            <button onClick={() => openModal()}
              className="flex items-center gap-2 px-4 py-2 bg-[#00CC00] text-white rounded-xl text-sm hover:bg-[#00b300] transition-colors shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t.categories?.createCategory || 'Добавить категорию'}
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <div className="relative">
                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.common?.search || 'Поиск'}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00]" />
              </div>
            </div>

            <div className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <div className="p-10 text-center text-gray-400 text-sm">
                  {search ? 'Ничего не найдено' : (t.categories?.noCategories || 'Нет категорий')}
                </div>
              ) : filtered.map((cat) => (
                <div key={cat.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 flex items-center justify-center bg-green-50 rounded-xl flex-shrink-0 text-[#00CC00] overflow-hidden">
                    <SvgIcon iconKey={cat.icon} className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{getName(cat.translations, 'ru')}</p>
                    <p className="text-xs text-gray-400">
                      {getName(cat.translations, 'kg')} · slug: <span className="font-mono">{cat.slug}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Tooltip text="Редактировать">
                      <button onClick={() => openModal(cat)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </Tooltip>
                    <Tooltip text="Удалить">
                      <button onClick={() => setDeleteConfirm({ id: cat.id, name: getName(cat.translations) })}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {modal.item ? (t.categories?.editCategory || 'Редактировать') : (t.categories?.createCategory || 'Добавить категорию')}
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
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Slug *</label>
                  <input value={slug} onChange={(e) => setSlug(e.target.value)}
                    placeholder="ecology"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Иконка *</label>
                  <IconPicker value={icon} onChange={setIcon} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Название (русский) *</label>
                <input value={nameRu} onChange={(e) => setNameRu(e.target.value)}
                  placeholder="Экология"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00]" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-600">Название (кыргызский)</label>
                  <TranslateBtn onClick={handleTranslate} loading={translating} />
                </div>
                <input value={nameKg} onChange={(e) => setNameKg(e.target.value)}
                  placeholder="Экология (кырг.)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00]" />
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.categories?.deleteConfirm || 'Удалить эту категорию?'} «{deleteConfirm.name}»?</h3>
            <p className="text-gray-500 text-sm mb-6">Нельзя удалить категорию, используемую в проектах.</p>
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
