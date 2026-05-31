'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import VolunteerNav from '../components/VolunteerNav';
import VolunteerSidebar from '../components/VolunteerSidebar';
import AiSupportButton from '@/app/components/AiSupportButton';
import DynamicContent from '@/app/components/DynamicContent';
import { SidebarProvider } from '@/app/contexts/SidebarContext';
import { useToast } from '@/app/components/ToastContainer';

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  role: string;
  avatarUrl?: string;
}

export default function VolunteerSettingsPage() {
  const router = useRouter();
  const toast = useToast();

  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Active section (tab)
  const [activeSection, setActiveSection] = useState<'password' | 'account' | 'danger'>('password');

  const loadUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) { router.push('/login'); return; }
      const data = await res.json();
      if (data.user.role !== 'volunteer') { router.push('/dashboard'); return; }

      const profileRes = await fetch('/api/volunteer/profile');
      if (!profileRes.ok) { router.push('/login'); return; }
      const profileData = await profileRes.json();

      setUser({ ...profileData.user, role: data.user.role });
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadUser(); }, [loadUser]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Новые пароли не совпадают');
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch('/api/volunteer/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Ошибка при смене пароля'); return; }
      toast.success('Пароль успешно изменён');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error('Ошибка при смене пароля');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== 'УДАЛИТЬ') return;
    setDeleting(true);
    try {
      const res = await fetch('/api/volunteer/profile', { method: 'DELETE' });
      if (!res.ok) { toast.error('Ошибка при удалении аккаунта'); return; }
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch {
      toast.error('Ошибка при удалении аккаунта');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00]" />
      </div>
    );
  }

  if (!user) return null;

  const eyeIcon = (show: boolean) => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {show ? (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </>
      ) : (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </>
      )}
    </svg>
  );

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50">
        <VolunteerSidebar user={user} />
        <VolunteerNav user={user} />

        <DynamicContent maxWidth="max-w-4xl">
          {/* Page header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Настройки</h1>
            <p className="text-gray-500 text-sm mt-1">Управление аккаунтом и безопасностью</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">

            {/* ── Right mini sidebar (shown at top on mobile) ── */}
            <aside className="w-full sm:w-48 shrink-0 sm:sticky sm:top-24 sm:order-2">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2 hidden sm:block">Разделы</p>
                <nav className="flex sm:flex-col gap-1 overflow-x-auto">
                  {([
                    { id: 'password' as const, label: 'Смена пароля', danger: false, icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> },
                    { id: 'account' as const, label: 'Аккаунт', danger: false, icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
                    { id: 'danger' as const, label: 'Опасная зона', danger: true, icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> },
                  ]).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`flex-shrink-0 sm:w-full flex items-center gap-2 sm:gap-2.5 px-3 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors text-left whitespace-nowrap ${
                        activeSection === item.id
                          ? item.danger ? 'bg-red-50 text-red-600' : 'bg-green-50 text-[#00CC00]'
                          : item.danger ? 'text-red-400 hover:bg-red-50 hover:text-red-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <span className={activeSection === item.id ? (item.danger ? 'text-red-500' : 'text-[#00CC00]') : 'text-gray-400'}>
                        {item.icon}
                      </span>
                      {item.label}
                    </button>
                  ))}
                </nav>
              </div>
            </aside>

            {/* ── Main content — only active section ── */}
            <div className="flex-1 min-w-0 sm:order-1">

              {/* Password section */}
              {activeSection === 'password' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Смена пароля</h2>
                      <p className="text-sm text-gray-500">Обновите пароль для защиты аккаунта</p>
                    </div>
                  </div>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Текущий пароль</label>
                      <div className="relative">
                        <input type={showCurrent ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="w-full px-4 py-2.5 pr-11 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent" placeholder="Введите текущий пароль" />
                        <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{eyeIcon(showCurrent)}</button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Новый пароль</label>
                      <div className="relative">
                        <input type={showNew ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} className="w-full px-4 py-2.5 pr-11 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent" placeholder="Минимум 6 символов" />
                        <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{eyeIcon(showNew)}</button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Подтвердите новый пароль</label>
                      <div className="relative">
                        <input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={`w-full px-4 py-2.5 pr-11 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent ${confirmPassword && confirmPassword !== newPassword ? 'border-red-300' : 'border-gray-200'}`} placeholder="Повторите новый пароль" />
                        <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{eyeIcon(showConfirm)}</button>
                      </div>
                      {confirmPassword && confirmPassword !== newPassword && <p className="mt-1 text-xs text-red-500">Пароли не совпадают</p>}
                    </div>
                    <button type="submit" disabled={savingPassword || (!!confirmPassword && confirmPassword !== newPassword)} className="w-full py-2.5 bg-[#00CC00] text-white rounded-xl font-medium hover:bg-[#00b300] transition-colors disabled:opacity-60">
                      {savingPassword ? 'Сохранение...' : 'Сменить пароль'}
                    </button>
                  </form>
                </div>
              )}

              {/* Account section */}
              {activeSection === 'account' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Информация об аккаунте</h2>
                      <p className="text-sm text-gray-500">Основные данные вашего аккаунта</p>
                    </div>
                  </div>
                  <div className="space-y-1 mb-4">
                    {[
                      { label: 'Email', value: user.email },
                      { label: 'Имя', value: `${user.firstName} ${user.lastName}` },
                      { label: 'Телефон', value: user.phone || '—' },
                      { label: 'Город', value: user.city || '—' },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                        <span className="text-sm text-gray-500">{label}</span>
                        <span className="text-sm font-medium text-gray-900">{value}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => router.push('/volunteer/profile')} className="w-full py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm">
                    Перейти в профиль для редактирования
                  </button>
                </div>
              )}

              {/* Danger section */}
              {activeSection === 'danger' && (
                <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-red-600">Опасная зона</h2>
                      <p className="text-sm text-gray-500">Необратимые действия с аккаунтом</p>
                    </div>
                  </div>
                  {!showDeleteConfirm ? (
                    <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Удалить аккаунт</p>
                        <p className="text-xs text-gray-500 mt-0.5">Все данные будут удалены безвозвратно</p>
                      </div>
                      <button onClick={() => setShowDeleteConfirm(true)} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors">Удалить</button>
                    </div>
                  ) : (
                    <div className="p-4 bg-red-50 rounded-xl border border-red-200 space-y-3">
                      <p className="text-sm font-medium text-gray-900">Вы уверены? Это действие необратимо.</p>
                      <p className="text-sm text-gray-600">Для подтверждения введите <span className="font-mono font-bold text-red-600">УДАЛИТЬ</span></p>
                      <input type="text" value={deleteInput} onChange={(e) => setDeleteInput(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-red-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300 text-sm" placeholder="УДАЛИТЬ" />
                      <div className="flex gap-3">
                        <button onClick={handleDeleteAccount} disabled={deleteInput !== 'УДАЛИТЬ' || deleting} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                          {deleting ? 'Удаление...' : 'Подтвердить удаление'}
                        </button>
                        <button onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">Отменить</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </DynamicContent>

        <AiSupportButton />
      </div>
    </SidebarProvider>
  );
}
