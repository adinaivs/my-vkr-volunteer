'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OrganizerNav from '../components/OrganizerNav';
import OrganizerSidebar from '../components/OrganizerSidebar';
import AiSupportButton from '@/app/components/AiSupportButton';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  role: string;
  avatarUrl?: string;
}

interface OrganizerProfile {
  organizationName: string;
  inn: string;
  okpo: string;
  legalAddress: string;
  actualAddress: string;
  verificationStatus: string;
  isRejected: boolean;
  rejectionReason?: string;
  rejectedAt?: string;
}

export default function OrganizerProfile() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<OrganizerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    city: '',
    organizationName: '',
    legalAddress: '',
    actualAddress: '',
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
          router.push('/login');
          return;
        }
        const data = await response.json();
        if (data.user.role !== 'organizer') {
          router.push('/dashboard');
          return;
        }
        setUser(data.user);
        setFormData({
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          phone: data.user.phone,
          city: data.user.city,
          organizationName: '',
          legalAddress: '',
          actualAddress: '',
        });
        
        // Загружаем профиль организатора из данных пользователя
        if (data.user.organizerProfile) {
          setProfile({
            organizationName: data.user.organizerProfile.organizationName,
            inn: data.user.organizerProfile.inn,
            okpo: data.user.organizerProfile.okpo,
            legalAddress: data.user.organizerProfile.legalAddress,
            actualAddress: data.user.organizerProfile.actualAddress,
            verificationStatus: data.user.organizerProfile.isApprovedByAdmin 
              ? 'verified' 
              : data.user.organizerProfile.isRejected 
                ? 'rejected' 
                : 'pending',
            isRejected: data.user.organizerProfile.isRejected,
            rejectionReason: data.user.organizerProfile.rejectionReason,
            rejectedAt: data.user.organizerProfile.rejectedAt,
          });
        }
      } catch (error) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00] mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const getVerificationBadge = () => {
    switch (profile?.verificationStatus) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Верифицирован
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            На проверке
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
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <OrganizerSidebar user={user} />
      <OrganizerNav user={user} />

      {/* Main Content */}
      <main className="lg:ml-[272px] max-w-5xl px-4 sm:px-6 lg:px-8 pt-20 lg:pt-[88px] pb-20 lg:pb-8">
        {/* Profile Header */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="h-32 bg-gradient-to-r from-[#00CC00] to-emerald-500"></div>
          <div className="px-8 pb-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 -mt-16">
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
              
              <div className="flex-1 text-center sm:text-left sm:mt-12">
                <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">
                    {user.firstName} {user.lastName}
                  </h1>
                  {getVerificationBadge()}
                </div>
                <p className="text-gray-600 mb-1">{profile?.organizationName}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>

              <div className="flex gap-3 sm:mt-12">
                <button
                  onClick={() => setEditing(!editing)}
                  className="px-6 py-2 bg-[#00CC00] text-white rounded-full font-medium hover:bg-[#00b300] transition-colors"
                >
                  {editing ? 'Отменить' : 'Редактировать'}
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
        {profile?.verificationStatus === 'pending' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-yellow-900 mb-1">Аккаунт на проверке</h3>
                <p className="text-sm text-yellow-800">
                  Ваш аккаунт находится на проверке администраторами. Это может занять 1-3 рабочих дня. 
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
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-red-900 mb-1">Ваша заявка отклонена</h3>
                {profile.rejectionReason && (
                  <div className="bg-red-100 rounded-lg p-3 mb-3 mt-2">
                    <p className="text-sm font-medium text-red-900 mb-1">Причина отклонения:</p>
                    <p className="text-sm text-red-800">{profile.rejectionReason}</p>
                  </div>
                )}
                {profile.rejectedAt && (
                  <p className="text-red-600 text-xs mb-3">
                    Отклонено: {new Date(profile.rejectedAt).toLocaleDateString('ru-RU')}
                  </p>
                )}
                <p className="text-sm text-red-800 mb-4">
                  Вы можете исправить данные и отправить заявку повторно.
                </p>
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

        {/* Personal Information */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Личная информация</h2>
          
          {editing ? (
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Имя</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Фамилия</label>
                  <input
                    type="text"
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
                  className="px-6 py-3 bg-[#00CC00] text-white rounded-xl font-medium hover:bg-[#00b300] transition-colors"
                >
                  Сохранить изменения
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Отменить
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Email</div>
                  <div className="text-gray-900 font-medium">{user.email}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Телефон</div>
                  <div className="text-gray-900 font-medium">{user.phone}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Город</div>
                  <div className="text-gray-900 font-medium">{user.city}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Роль</div>
                  <div className="text-gray-900 font-medium">Организатор</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Organization Information */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Информация об организации</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-gray-600 mb-1">Название организации</div>
                <div className="text-gray-900 font-medium">{profile?.organizationName}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">ИНН</div>
                <div className="text-gray-900 font-medium">{profile?.inn}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-gray-600 mb-1">ОКПО</div>
                <div className="text-gray-900 font-medium">{profile?.okpo}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Статус верификации</div>
                <div>{getVerificationBadge()}</div>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Юридический адрес</div>
              <div className="text-gray-900 font-medium">{profile?.legalAddress}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Фактический адрес</div>
              <div className="text-gray-900 font-medium">{profile?.actualAddress}</div>
            </div>
          </div>
        </div>
      </main>

      {/* AI Support Button */}
      <AiSupportButton />
    </div>
  );
}
