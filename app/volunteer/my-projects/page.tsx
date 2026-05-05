'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import VolunteerNav from '../components/VolunteerNav';
import VolunteerSidebar from '../components/VolunteerSidebar';
import AiSupportButton from '@/app/components/AiSupportButton';
import DynamicContent from '@/app/components/DynamicContent';
import { SidebarProvider } from '@/app/contexts/SidebarContext';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

export default function MyProjects() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'applications'>('active');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
          router.push('/login');
          return;
        }
        const data = await response.json();
        if (data.user.role !== 'volunteer') {
          router.push('/dashboard');
          return;
        }
        setUser(data.user);
      } catch (error) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

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

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50">
        <VolunteerSidebar user={user} />
        <VolunteerNav user={user} />

        {/* Main Content */}
        <DynamicContent>
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Мои проекты</h1>
          <p className="text-gray-600">Управляйте своими проектами и заявками</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'active'
                  ? 'text-[#00CC00] border-b-2 border-[#00CC00]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Активные проекты
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'completed'
                  ? 'text-[#00CC00] border-b-2 border-[#00CC00]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Завершённые
            </button>
            <button
              onClick={() => setActiveTab('applications')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'applications'
                  ? 'text-[#00CC00] border-b-2 border-[#00CC00]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Мои заявки
            </button>
          </div>

          <div className="p-8">
            {/* Active Projects */}
            {activeTab === 'active' && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">У вас пока нет активных проектов</h3>
                <p className="text-gray-600 mb-6">Найдите интересный проект и подайте заявку на участие</p>
                <Link 
                  href="/volunteer/projects"
                  className="inline-block px-6 py-3 bg-[#00CC00] text-white rounded-full font-medium hover:bg-[#00b300] transition-colors"
                >
                  Найти проект
                </Link>
              </div>
            )}

            {/* Completed Projects */}
            {activeTab === 'completed' && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Нет завершённых проектов</h3>
                <p className="text-gray-600">Здесь будут отображаться проекты, которые вы завершили</p>
              </div>
            )}

            {/* Applications */}
            {activeTab === 'applications' && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">У вас пока нет заявок</h3>
                <p className="text-gray-600 mb-6">Подайте заявку на участие в проекте</p>
                <Link 
                  href="/volunteer/projects"
                  className="inline-block px-6 py-3 bg-[#00CC00] text-white rounded-full font-medium hover:bg-[#00b300] transition-colors"
                >
                  Найти проект
                </Link>
              </div>
            )}
          </div>
        </div>
      </DynamicContent>

      {/* AI Support Button */}
      <AiSupportButton />
    </div>
    </SidebarProvider>
  );
}
