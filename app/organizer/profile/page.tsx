'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import OrganizerNav from '../components/OrganizerNav';
import OrganizerSidebar from '../components/OrganizerSidebar';
import AiSupportButton from '@/app/components/AiSupportButton';
import DynamicContent from '@/app/components/DynamicContent';
import { SidebarProvider } from '@/app/contexts/SidebarContext';
import { useToast } from '@/app/components/ToastContainer';
import { useTranslation } from '@/app/i18n/useTranslation';

interface OrganizerProfileData {
  organizationName: string;
  inn: string;
  okpo: string;
  legalAddress: string;
  actualAddress: string;
  verificationStatus: string;
  verificationDocUrl?: string;
  freePostsRemaining: number;
  totalPaidPosts: number;
  isApprovedByAdmin: boolean;
  isRejected: boolean;
  rejectionReason?: string;
  rejectedAt?: string;
  approvedAt?: string;
}

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  role: string;
  avatarUrl?: string;
  createdAt?: string;
  organizerProfile: OrganizerProfileData | null;
}

interface Stats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  volunteersCount: number;
}

export default function OrganizerProfile() {
  const router = useRouter();
  const toast = useToast();
  const { t } = useTranslation('organizer');

  const [user, setUser] = useState<UserData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    city: '',
  });

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/organizer/profile');
      if (!res.ok) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      const u = data.user;

      // verify role via auth/me
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) { router.push('/login'); return; }
      const meData = await meRes.json();
      if (meData.user.role !== 'organizer') { router.push('/dashboard'); return; }

      setUser({ ...u, role: 'organizer' });
      setStats(data.stats);
      setFormData({
        firstName: u.firstName,
        lastName: u.lastName,
        phone: u.phone,
        city: u.city,
      });
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const form = new FormData();
      form.append('avatar', file);
      const res = await fetch('/api/upload/avatar', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Ошибка при загрузке аватара');
        return;
      }
      toast.success('Аватар обновлён');
      setUser((prev) => prev ? { ...prev, avatarUrl: data.avatarUrl } : prev);
    } catch {
      toast.error('Ошибка при загрузке аватара');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/organizer/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Ошибка при сохранении');
        return;
      }
      toast.success('Профиль сохранён');
      setEditing(false);
      await loadProfile();
    } catch {
      toast.error('Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  const profile = user?.organizerProfile;

  const getVerificationStatus = () => {
    if (profile?.isApprovedByAdmin) return 'verified';
    if (profile?.isRejected) return 'rejected';
    return 'pending';
  };

  const getVerificationBadge = () => {
    const status = getVerificationStatus();
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Верифицирован
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            Отклонён
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            На проверке
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00] mx-auto"></div>
          <p className="mt-4 text-gray-600">{t.common?.loading || 'Загрузка...'}</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50">
        <OrganizerSidebar user={user} />
        <OrganizerNav user={user} />

        <DynamicContent maxWidth="max-w-5xl">
          {/* Profile Header */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6">
            <div className="h-32 bg-gradient-to-r from-[#00CC00] to-emerald-500"></div>
            <div className="px-8 pb-8">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 -mt-16">
                {/* Avatar with upload overlay */}
                <label className="relative group cursor-pointer shrink-0">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.firstName}
                      className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-[#00CC00] flex items-center justify-center text-white font-bold text-4xl border-4 border-white shadow-lg">
                      {user.firstName?.[0]}{user.lastName?.[0]}
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-full bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {uploadingAvatar ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <svg className="w-6 h-6 text-white mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-white text-xs font-medium">Изменить</span>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/webp"
                    className="hidden"
                    disabled={uploadingAvatar}
                    onChange={handleAvatarChange}
                  />
                </label>

                <div className="flex-1 text-center sm:text-left sm:mt-12">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-1">
                    <h1 className="text-3xl font-bold text-gray-900">
                      {user.firstName} {user.lastName}
                    </h1>
                    {getVerificationBadge()}
                  </div>
                  <p className="text-gray-700 font-medium mb-1">{profile?.organizationName}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>

                <div className="flex gap-3 sm:mt-12">
                  <button
                    onClick={() => {
                      if (editing) {
                        setEditing(false);
                        setFormData({
                          firstName: user.firstName,
                          lastName: user.lastName,
                          phone: user.phone,
                          city: user.city,
                        });
                      } else {
                        setEditing(true);
                      }
                    }}
                    className="px-6 py-2 bg-[#00CC00] text-white rounded-full font-medium hover:bg-[#00b300] transition-colors"
                  >
                    {editing ? (t.common?.cancel || 'Отменить') : (t.profile?.editProfile || 'Редактировать')}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-full font-medium hover:bg-gray-200 transition-colors"
                  >
                    Выйти
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Alert */}
          {getVerificationStatus() === 'pending' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-yellow-900 mb-1">Аккаунт на проверке</h3>
                  <p className="text-sm text-yellow-800">
                    Ваш аккаунт находится на проверке администраторами. Это может занять 1–3 рабочих дня.
                    Уведомление о результате придёт на email.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Rejection Alert */}
          {profile?.isRejected && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-red-900 mb-1">Ваша заявка отклонена</h3>
                  {profile.rejectionReason && (
                    <div className="bg-red-100 rounded-lg p-3 my-2">
                      <p className="text-sm font-medium text-red-900 mb-1">Причина:</p>
                      <p className="text-sm text-red-800">{profile.rejectionReason}</p>
                    </div>
                  )}
                  {profile.rejectedAt && (
                    <p className="text-red-600 text-xs mb-3">
                      Отклонено: {new Date(profile.rejectedAt).toLocaleDateString('ru-RU')}
                    </p>
                  )}
                  <p className="text-sm text-red-800 mb-4">Исправьте данные и отправьте заявку повторно.</p>
                  <a
                    href="/organizer/profile/edit"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Редактировать данные
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats?.totalProjects ?? 0}</div>
              <div className="text-xs text-gray-500 mt-1">{t.profile?.totalProjects || 'Всего проектов'}</div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats?.activeProjects ?? 0}</div>
              <div className="text-xs text-gray-500 mt-1">{t.profile?.activeProjects || 'Активных'}</div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats?.volunteersCount ?? 0}</div>
              <div className="text-xs text-gray-500 mt-1">{t.profile?.totalVolunteers || 'Волонтёров'}</div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-gray-900">{profile?.freePostsRemaining ?? 0}</div>
              <div className="text-xs text-gray-500 mt-1">{t.projects?.freePostsLeft || 'Бесплатных публикаций'}</div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{t.profile?.title || 'Личная информация'}</h2>

            {editing ? (
              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Имя</label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Фамилия</label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Телефон</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Город</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-3 bg-[#00CC00] text-white rounded-xl font-medium hover:bg-[#00b300] transition-colors disabled:opacity-60"
                  >
                    {saving ? (t.common?.loading || 'Сохранение...') : (t.profile?.saveChanges || 'Сохранить изменения')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    {t.common?.cancel || 'Отменить'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Имя</div>
                    <div className="text-gray-900 font-medium">{user.firstName} {user.lastName}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Email</div>
                    <div className="text-gray-900 font-medium">{user.email}</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Телефон</div>
                    <div className="text-gray-900 font-medium">{user.phone}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Город</div>
                    <div className="text-gray-900 font-medium">{user.city}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Organization Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Информация об организации</h2>
              {profile?.isApprovedByAdmin && profile.approvedAt && (
                <span className="text-xs text-gray-400">
                  Верифицировано: {new Date(profile.approvedAt).toLocaleDateString('ru-RU')}
                </span>
              )}
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Название организации</div>
                  <div className="text-gray-900 font-medium">{profile?.organizationName || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Статус</div>
                  <div>{getVerificationBadge()}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">ИНН</div>
                  <div className="text-gray-900 font-medium">{profile?.inn || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">ОКПО</div>
                  <div className="text-gray-900 font-medium">{profile?.okpo || '—'}</div>
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Юридический адрес</div>
                <div className="text-gray-900 font-medium">{profile?.legalAddress || '—'}</div>
              </div>

              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Фактический адрес</div>
                <div className="text-gray-900 font-medium">{profile?.actualAddress || '—'}</div>
              </div>

              {profile?.verificationDocUrl && (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Документ верификации</div>
                  <a
                    href={profile.verificationDocUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[#00CC00] hover:text-[#00b300] text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Просмотреть документ
                  </a>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-gray-100">
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Бесплатных публикаций</div>
                  <div className="text-gray-900 font-medium">{profile?.freePostsRemaining ?? 0}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Оплаченных публикаций</div>
                  <div className="text-gray-900 font-medium">{profile?.totalPaidPosts ?? 0}</div>
                </div>
              </div>
            </div>
          </div>
        </DynamicContent>

        <AiSupportButton />
      </div>
    </SidebarProvider>
  );
}
