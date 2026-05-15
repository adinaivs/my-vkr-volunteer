'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminNav from '../components/AdminNav';
import AdminSidebar from '../components/AdminSidebar';
import DynamicContent from '@/app/components/DynamicContent';
import { SidebarProvider } from '@/app/contexts/SidebarContext';
import { useToast } from '@/app/components/ToastContainer';
import { useTranslation } from '@/app/i18n/useTranslation';

interface AdminUser { id: string; firstName: string; lastName: string; email: string; role: string; avatarUrl?: string; }

export default function AdminNotificationsPage() {
  const router = useRouter();
  const toast = useToast();
  const { t } = useTranslation('admin');
  const [me, setMe] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [active, setActive] = useState(false);
  const [saving, setSaving] = useState(false);

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
          const d = await res.json();
          setMessage(d.message || '');
          setActive(d.active || false);
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
      if (res.ok) toast.success('Объявление сохранено');
      else toast.error('Ошибка сохранения');
    } finally { setSaving(false); }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '', active: false }),
      });
      if (res.ok) { setMessage(''); setActive(false); toast.success('Объявление удалено'); }
    } finally { setSaving(false); }
  };

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
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">{t.notifications?.title || 'Объявления'}</h1>
            <p className="text-gray-500 mt-1 text-sm">{t.notifications?.notificationText || 'Системное объявление показывается всем пользователям платформы в виде баннера вверху страницы'}</p>
          </div>

          {/* Preview */}
          {message && (
            <div className="mb-5 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
              <div className="flex-1">
                <p className="text-xs font-medium text-amber-600 mb-1">Предпросмотр — так видят пользователи</p>
                <p className="text-sm text-amber-800">{message}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {active ? 'Активно' : 'Неактивно'}
              </span>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 p-6 max-w-2xl">
            <div className="space-y-5">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">{t.notifications?.notificationText || 'Текст объявления'}</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Введите текст объявления для всех пользователей платформы..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00] resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">{message.length} символов</p>
              </div>

              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setActive(!active)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${active ? 'bg-[#00CC00]' : 'bg-gray-200'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm text-gray-700">{active ? 'Объявление активно — видно всем' : 'Объявление скрыто'}</span>
              </div>

              <div className="flex gap-3">
                <button onClick={handleSave} disabled={saving}
                  className="px-6 py-2 bg-[#00CC00] text-white rounded-xl text-sm hover:bg-[#00b300] transition-colors disabled:opacity-50 flex items-center gap-2">
                  {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {saving ? (t.common?.loading || 'Сохранение...') : (t.common?.save || 'Сохранить')}
                </button>
                {(message || active) && (
                  <button onClick={handleClear} disabled={saving}
                    className="px-6 py-2 border border-red-200 text-red-500 rounded-xl text-sm hover:bg-red-50 transition-colors disabled:opacity-50">
                    {t.notifications?.deleteNotification || 'Удалить объявление'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </DynamicContent>
      </div>
    </SidebarProvider>
  );
}
