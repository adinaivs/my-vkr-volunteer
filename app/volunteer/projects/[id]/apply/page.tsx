'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import VolunteerNav from '../../../components/VolunteerNav';
import AiSupportButton from '@/app/components/AiSupportButton';
import { useToast } from '@/app/components/ToastContainer';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  volunteerProfile?: {
    bio?: string;
    skills: Array<{ id: string; name: string }>;
  };
}

interface Category {
  id: string;
  name: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  location: string;
  startDate: string;
  endDate: string;
  maxVolunteers: number;
  currentVolunteers: number;
  category: Category;
  organizer: {
    firstName: string;
    lastName: string;
    organizerProfile?: {
      organizationName: string;
    };
  };
}

interface Skill {
  id: string;
  name: string;
}

export default function ApplyToProject() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const toast = useToast();
  
  const [user, setUser] = useState<User | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Форма заявки
  const [motivation, setMotivation] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [experience, setExperience] = useState('');
  const [availability, setAvailability] = useState('');

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
        
        // Заполняем контакты из профиля
        setEmail(data.user.email || '');
        setPhone(data.user.phone || '');
        
        // Заполняем навыки из профиля
        if (data.user.volunteerProfile?.skills) {
          setSelectedSkills(data.user.volunteerProfile.skills.map((s: Skill) => s.id));
        }
        
        // Загружаем проект и навыки
        await Promise.all([loadProject(), loadSkills()]);
      } catch (error) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, projectId]);

  const loadProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data.project);
      } else {
        router.push('/volunteer/projects');
      }
    } catch (error) {
      console.error('Ошибка загрузки проекта:', error);
      router.push('/volunteer/projects');
    }
  };

  const loadSkills = async () => {
    try {
      const response = await fetch('/api/skills');
      if (response.ok) {
        const data = await response.json();
        setAllSkills(data.skills || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки навыков:', error);
    }
  };

  const toggleSkill = (skillId: string) => {
    setSelectedSkills(prev => 
      prev.includes(skillId) 
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!motivation.trim()) {
      toast.error('Пожалуйста, укажите причину участия');
      return;
    }

    if (motivation.trim().length < 50) {
      toast.error('Причина участия должна содержать минимум 50 символов');
      return;
    }

    if (!phone.trim() || !email.trim()) {
      toast.error('Пожалуйста, заполните контактные данные');
      return;
    }

    setSubmitting(true);
    try {
      // TODO: Реализовать API для подачи заявки
      const response = await fetch(`/api/projects/${projectId}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          motivation,
          phone,
          email,
          skills: selectedSkills,
          experience,
          availability,
        }),
      });

      if (response.ok) {
        toast.success('Заявка успешно отправлена! Организатор свяжется с вами в ближайшее время.');
        router.replace(`/volunteer/projects/${projectId}`);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Ошибка при отправке заявки');
      }
    } catch (error) {
      console.error('Ошибка при подаче заявки:', error);
      toast.error('Произошла ошибка при отправке заявки');
    } finally {
      setSubmitting(false);
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

  if (!user || !project) {
    return null;
  }

  return (
    <div className="min-h-screen bg-green-50">
      <VolunteerNav user={user} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-24">
        {/* Header with back button */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full border-2 border-gray-300 hover:border-[#00CC00] hover:bg-[#00CC00] hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Подать заявку</h1>
            <p className="text-sm text-gray-600">Заполните форму для участия в проекте</p>
          </div>
        </div>

        {/* Project Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="flex items-center gap-4 p-4">
            {project.imageUrl ? (
              <img 
                src={project.imageUrl} 
                alt={project.title}
                className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-10 h-10 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-900 mb-1">{project.title}</h3>
              <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {project.category.name}
                </div>
                <div className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {project.location}
                </div>
                <div className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {new Date(project.startDate).toLocaleDateString('ru-RU')}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Организатор: {project.organizer.organizerProfile?.organizationName || 
                  `${project.organizer.firstName} ${project.organizer.lastName}`}
              </p>
            </div>
          </div>
        </div>

        {/* Application Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Motivation */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Почему вы хотите участвовать?</h2>
            <textarea
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              placeholder="Расскажите, почему вас заинтересовал этот проект и что вы можете привнести..."
              rows={5}
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500">
                Минимум 50 символов. Организатор увидит ваш ответ.
              </p>
              <div className="flex items-center gap-1">
                <span className={`text-xs font-medium ${
                  motivation.length < 50 
                    ? 'text-orange-600' 
                    : 'text-[#00CC00]'
                }`}>
                  {motivation.length}
                </span>
                <span className="text-xs text-gray-400">/</span>
                <span className="text-xs text-gray-500">50</span>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Контактная информация</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Номер телефона <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+996 XXX XXX XXX"
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500">
                Организатор свяжется с вами по указанным контактам
              </p>
            </div>
          </div>

          {/* Skills */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Ваши навыки</h2>
            <p className="text-sm text-gray-600 mb-4">
              Выберите навыки, которыми вы обладаете и которые могут быть полезны в проекте
            </p>
            <div className="flex flex-wrap gap-2">
              {allSkills.map((skill) => (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => toggleSkill(skill.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedSkills.includes(skill.id)
                      ? 'bg-[#00CC00] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {skill.name}
                </button>
              ))}
            </div>
          </div>

          {/* Experience */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Опыт волонтерства (необязательно)</h2>
            <textarea
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder="Расскажите о вашем предыдущем опыте волонтерства или участия в подобных проектах..."
              rows={4}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent resize-none"
            />
          </div>

          {/* Availability */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Доступность (необязательно)</h2>
            <textarea
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              placeholder="Укажите, когда вы можете участвовать в проекте (дни недели, время)..."
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent resize-none"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-[#00CC00] text-white rounded-xl font-semibold hover:bg-[#00b300] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {submitting ? 'Отправка...' : 'Отправить заявку'}
            </button>
          </div>
        </form>
      </div>

      <AiSupportButton />
    </div>
  );
}
