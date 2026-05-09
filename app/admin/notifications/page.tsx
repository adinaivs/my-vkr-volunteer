'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminNav from '../components/AdminNav';
import AdminSidebar from '../components/AdminSidebar';
import DynamicContent from '@/app/components/DynamicContent';
import { SidebarProvider } from '@/app/contexts/SidebarContext';
import { useToast } from '@/app/components/ToastContainer';

interface AdminUser { id: string; firstName: string; lastName: string; email: string; role: string; avatarUrl?: string; }

export default function AdminNotificationsPage() {
  const router = useRouter();
  const toast = useToast();
  const [me, setMe] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [active, setActive] = useState(false);
  const [saved, setSaved] = useState<{ message: string; active: boolean } | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) { router.push('/admin/login'); return; }
        const { user } = await meRes.json();
        if (user.role !== 'admin') { router.push('/'); return; }
        setMe(user);
        const res = await fetch('/api/admin/notifications');
        if (res.ok) {
          const data = await res.json();
          setMessage(data.message || '');
          setActive(data.active || false);
          setSaved({ message: data.message || '', active: data.active || false });
        }
      } finally { setLoading(false); }
    };
    init();
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, active }),
      });
      if (res.ok) {
        toast.success('Объявление сохранено');
        setSaved({ message, active });
      } else {
        toast.error('Ошибка сохранения');
      }
    } finally { setSaving(false); }
  };

  const handleClear = async () => {
    setMessage('');
    setActive(false);
    setSaving(true);
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '', active: false }),
      });
      if (res.ok) {
        toast.success('Объявление удалено');
        setSaved({ message: '', active: false });
      }
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00]" />
    </div>
  );

  const hasChanges = message !== saved?.message || active !== saved?.active;

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50">
        {me && <><AdminNav user={me} /><AdminSidebar user={me} /></>}
        <DynamicContent>
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Объявления</h1>
            <p className="text-gray-500 mt-1 text-sm">Системное объявление, отображаемое пользователям на платформе</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-5">
              {/* Editor */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-gray-900">Текст объявления</h2>
                  <button type="button" onClick={() => setActive(!active)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm transition-colors border ${
                      active
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}>
                    <span className={`w-2 h-2 rounded-full ${active ? 'bg-green-500' : 'bg-gray-400'}`} />
                    {active ? 'Активно' : 'Выключено'}
                  </button>
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  maxLength={500}
                  placeholder="Введите текст объявления для всех пользователей платформы..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00] resize-none"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-400">{message.length}/500 символов</span>
                  {message.trim() && (
                    <button onClick={handleClear} className="text-xs text-red-500 hover:underline">
                      Очистить
                    </button>
                  )}
                </div>

                <div className="flex gap-3 mt-4">
                  <button onClick={handleSave} disabled={saving || !hasChanges}
                    className="flex-1 px-4 py-2 bg-[#00CC00] text-white rounded-xl text-sm hover:bg-[#00b300] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {saving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </div>

              {/* Preview */}
              {message.trim() && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h2 className="text-base font-semibold text-gray-900 mb-4">Предпросмотр</h2>
                  <div className={`p-4 rounded-xl border-l-4 ${active ? 'bg-blue-50 border-blue-400' : 'bg-gray-50 border-gray-300'}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-xl">📢</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900 mb-1">Объявление администрации</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{message}</p>
                      </div>
                    </div>
                  </div>
                  {!active && (
                    <p className="text-xs text-gray-400 mt-2">Объявление сохранено, но не отображается пользователям. Включите его выше.</p>
                  )}
                </div>
              )}
            </div>

            {/* Info panel */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Текущий статус</h3>
                <div className={`flex items-center gap-2 p-3 rounded-xl ${saved?.active && saved?.message ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${saved?.active && saved?.message ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className="text-sm font-medium">
                    {saved?.active && saved?.message ? 'Объявление активно' : 'Объявление не отображается'}
                  </span>
                </div>
                {saved?.message && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">Сохранённый текст:</p>
                    <p className="text-xs text-gray-700 line-clamp-3">{saved.message}</p>
                  </div>
                )}
              </div>

              <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
                <div className="flex items-start gap-3">
                  <span className="text-lg">💡</span>
                  <div>
                    <p className="text-sm font-semibold text-amber-800 mb-1">Как это работает</p>
                    <ul className="text-xs text-amber-700 space-y-1.5">
                      <li>Объявление показывается всем авторизованным пользователям на главной странице</li>
                      <li>Переключите статус «Активно», чтобы показать или скрыть баннер</li>
                      <li>Изменения вступают в силу сразу после сохранения</li>
                      <li>Максимум 500 символов</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DynamicContent>
      </div>
    </SidebarProvider>
  );
}
