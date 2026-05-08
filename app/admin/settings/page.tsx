'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminNav from '../components/AdminNav';
import AdminSidebar from '../components/AdminSidebar';
import DynamicContent from '@/app/components/DynamicContent';
import { SidebarProvider } from '@/app/contexts/SidebarContext';
import { useToast } from '@/app/components/ToastContainer';

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const toast = useToast();
  const [me, setMe] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [freePosts, setFreePosts] = useState(3);
  const [tempFreePosts, setTempFreePosts] = useState(3);
  const [editingFreePosts, setEditingFreePosts] = useState(false);
  const [savingFreePosts, setSavingFreePosts] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) { router.push('/admin/login'); return; }
        const { user } = await meRes.json();
        if (user.role !== 'admin') { router.push('/'); return; }
        setMe(user);

        const freeRes = await fetch('/api/admin/settings/free-posts');
        if (freeRes.ok) {
          const data = await freeRes.json();
          setFreePosts(data.defaultFreePosts);
          setTempFreePosts(data.defaultFreePosts);
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  const handleSaveFreePosts = async () => {
    if (tempFreePosts < 0) {
      toast.error('Значение не может быть отрицательным');
      return;
    }
    setSavingFreePosts(true);
    try {
      const res = await fetch('/api/admin/settings/free-posts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultFreePosts: tempFreePosts }),
      });
      if (res.ok) {
        const data = await res.json();
        setFreePosts(data.defaultFreePosts);
        setEditingFreePosts(false);
        toast.success('Настройка сохранена');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Ошибка сохранения');
      }
    } catch {
      toast.error('Ошибка сети');
    } finally {
      setSavingFreePosts(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00]" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50">
        {me && <><AdminNav user={me} /><AdminSidebar user={me} /></>}

        <DynamicContent>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Настройки</h1>
            <p className="text-gray-500 mt-1 text-sm">Системные настройки платформы</p>
          </div>

          <div className="space-y-6">
            {/* Бесплатные публикации */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">Публикации для организаторов</h2>
                <p className="text-sm text-gray-500 mt-0.5">Сколько бесплатных публикаций получает каждый новый организатор после верификации</p>
              </div>
              <div className="px-6 py-5">
                {!editingFreePosts ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-[#00CC00]/10 rounded-2xl flex items-center justify-center">
                        <svg className="w-7 h-7 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-gray-900">{freePosts}</p>
                        <p className="text-sm text-gray-500">бесплатных публикаций</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingFreePosts(true)}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Изменить
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      min="0"
                      value={tempFreePosts}
                      onChange={(e) => setTempFreePosts(parseInt(e.target.value) || 0)}
                      disabled={savingFreePosts}
                      className="w-24 px-4 py-2 border border-gray-200 rounded-xl text-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-[#00CC00]"
                    />
                    <button
                      onClick={handleSaveFreePosts}
                      disabled={savingFreePosts}
                      className="flex items-center gap-2 px-4 py-2 bg-[#00CC00] text-white rounded-xl text-sm hover:bg-[#00b300] transition-colors disabled:opacity-50"
                    >
                      {savingFreePosts ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      Сохранить
                    </button>
                    <button
                      onClick={() => { setTempFreePosts(freePosts); setEditingFreePosts(false); }}
                      disabled={savingFreePosts}
                      className="px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Отмена
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </DynamicContent>
      </div>
    </SidebarProvider>
  );
}
