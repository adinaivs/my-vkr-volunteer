'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OrganizerNav from '../components/OrganizerNav';
import OrganizerSidebar from '../components/OrganizerSidebar';
import AiSupportButton from '@/app/components/AiSupportButton';
import DynamicContent from '@/app/components/DynamicContent';
import { SidebarProvider } from '@/app/contexts/SidebarContext';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

interface VolunteerProfile {
  bio?: string;
  trustScore: number;
  completedTasks: number;
  completedProjects: number;
}

interface Volunteer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  city: string;
  volunteerProfile?: VolunteerProfile;
  skills: Array<{
    id: string;
    name: string;
  }>;
}

export default function OrganizerVolunteers() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [filteredVolunteers, setFilteredVolunteers] = useState<Volunteer[]>([]);
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Блокировка скролла при открытии модального окна
  useEffect(() => {
    if (showDetailsModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showDetailsModal]);

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
        
        // Загружаем волонтеров
        await loadVolunteers();
      } catch (error) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const loadVolunteers = async () => {
    try {
      const response = await fetch('/api/volunteers');
      if (response.ok) {
        const data = await response.json();
        setVolunteers(data.volunteers || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки волонтеров:', error);
    }
  };

  // Фильтрация волонтеров
  useEffect(() => {
    let filtered = [...volunteers];

    // Фильтр по поиску
    if (searchQuery) {
      filtered = filtered.filter(volunteer =>
        volunteer.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        volunteer.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        volunteer.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        volunteer.skills.some(skill => 
          skill.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    setFilteredVolunteers(filtered);
  }, [volunteers, searchQuery]);

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
        <OrganizerSidebar user={user} />
        <OrganizerNav user={user} />

        {/* Main Content */}
        <DynamicContent>
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Волонтёры</h1>
          <p className="text-gray-600">Просматривайте профили зарегистрированных волонтёров</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-300">
          <div className="p-6">
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <svg 
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Поиск по имени, городу или навыкам..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                />
              </div>
            </div>

            {/* Volunteers List */}
            {filteredVolunteers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVolunteers.map((volunteer) => (
                  <div
                    key={volunteer.id}
                    onClick={() => {
                      setSelectedVolunteer(volunteer);
                      setShowDetailsModal(true);
                    }}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-[#00CC00] transition-colors cursor-pointer"
                  >
                    {/* Volunteer Avatar */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                        {volunteer.avatarUrl ? (
                          <img src={volunteer.avatarUrl} alt="Волонтер" className="w-full h-full object-cover" />
                        ) : (
                          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {volunteer.firstName} {volunteer.lastName}
                        </h3>
                        <p className="text-xs text-gray-600">{volunteer.city}</p>
                      </div>
                    </div>

                    {/* Stats */}
                    {volunteer.volunteerProfile && (
                      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                        <div>
                          <p className="text-lg font-bold text-[#00CC00]">
                            {volunteer.volunteerProfile.completedProjects}
                          </p>
                          <p className="text-xs text-gray-600">Проектов</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-[#00CC00]">
                            {volunteer.volunteerProfile.completedTasks}
                          </p>
                          <p className="text-xs text-gray-600">Задач</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-[#00CC00]">
                            {Number(volunteer.volunteerProfile.trustScore).toFixed(1)}
                          </p>
                          <p className="text-xs text-gray-600">Рейтинг</p>
                        </div>
                      </div>
                    )}

                    {/* Skills */}
                    {volunteer.skills.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Навыки:</p>
                        <div className="flex flex-wrap gap-1">
                          {volunteer.skills.slice(0, 3).map((skill) => (
                            <span key={skill.id} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                              {skill.name}
                            </span>
                          ))}
                          {volunteer.skills.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                              +{volunteer.skills.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {searchQuery ? 'Волонтёры не найдены' : 'Нет зарегистрированных волонтёров'}
                </h3>
                <p className="text-gray-600">
                  {searchQuery 
                    ? 'Попробуйте изменить поисковый запрос'
                    : 'Волонтёры появятся здесь после регистрации на платформе'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </DynamicContent>

      {/* Volunteer Details Modal */}
      {showDetailsModal && selectedVolunteer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Профиль волонтёра</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Volunteer Info */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                    {selectedVolunteer.avatarUrl ? (
                      <img src={selectedVolunteer.avatarUrl} alt="Волонтер" className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      {selectedVolunteer.firstName} {selectedVolunteer.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">{selectedVolunteer.city}</p>
                  </div>
                </div>

                {/* Stats */}
                {selectedVolunteer.volunteerProfile && (
                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-200">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#00CC00]">
                        {selectedVolunteer.volunteerProfile.completedProjects}
                      </p>
                      <p className="text-xs text-gray-600">Проектов</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#00CC00]">
                        {selectedVolunteer.volunteerProfile.completedTasks}
                      </p>
                      <p className="text-xs text-gray-600">Задач</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#00CC00]">
                        {Number(selectedVolunteer.volunteerProfile.trustScore).toFixed(1)}
                      </p>
                      <p className="text-xs text-gray-600">Рейтинг</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Bio */}
              {selectedVolunteer.volunteerProfile?.bio && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">О себе</h3>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedVolunteer.volunteerProfile.bio}</p>
                  </div>
                </div>
              )}

              {/* Contact Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Контакты</h3>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-gray-900">{selectedVolunteer.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-gray-900">{selectedVolunteer.phone}</span>
                  </div>
                </div>
              </div>

              {/* Skills */}
              {selectedVolunteer.skills.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Навыки</h3>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex flex-wrap gap-2">
                      {selectedVolunteer.skills.map((skill) => (
                        <span key={skill.id} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                          {skill.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Support Button */}
      <AiSupportButton />
    </div>
    </SidebarProvider>
  );
}