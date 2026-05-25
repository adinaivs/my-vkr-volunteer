'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import VolunteerNav from '../components/VolunteerNav';
import VolunteerSidebar from '../components/VolunteerSidebar';
import AiSupportButton from '@/app/components/AiSupportButton';
import DynamicContent from '@/app/components/DynamicContent';
import { SidebarProvider } from '@/app/contexts/SidebarContext';
import { useToast } from '@/app/components/ToastContainer';
import { useTranslation } from '@/app/i18n/useTranslation';
import CustomSelect from '@/app/components/CustomSelect';

interface Skill {
  id: string;
  name: string;
}

interface VolunteerProfileData {
  bio?: string | null;
  trustScore: number;
  ratingCount: number;
  completedTasks: number;
  completedProjects: number;
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
  volunteerProfile: VolunteerProfileData | null;
  skills: Skill[];
}

function getRatingWord(count: number, locale: string, ratingsCountLabel: string): string {
  if (locale === 'kg') return ratingsCountLabel || 'баалоо';
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return ratingsCountLabel || 'оценок';
  if (mod10 === 1) return 'оценка';
  if (mod10 >= 2 && mod10 <= 4) return 'оценки';
  return ratingsCountLabel || 'оценок';
}

function StarRating({ score, count, locale, noRatingsLabel, ratingsCountLabel }: {
  score: number;
  count: number;
  locale: string;
  noRatingsLabel: string;
  ratingsCountLabel: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = score >= star;
          const partial = !filled && score > star - 1;
          return (
            <div key={star} className="relative w-5 h-5">
              <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {(filled || partial) && (
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: filled ? '100%' : `${(score - (star - 1)) * 100}%` }}
                >
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <span className="text-base font-semibold text-gray-800">
        {score > 0 ? score.toFixed(1) : '—'}
      </span>
      <span className="text-sm text-gray-500">
        {count > 0 ? `(${count} ${getRatingWord(count, locale, ratingsCountLabel)})` : noRatingsLabel}
      </span>
    </div>
  );
}

export default function VolunteerProfilePage() {
  const router = useRouter();
  const toast = useToast();
  const { t, locale } = useTranslation('volunteer');

  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    city: '',
    bio: '',
  });

  // Avatar state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [generatingBooklet, setGeneratingBooklet] = useState(false);

  const handleDownloadBooklet = async () => {
    setGeneratingBooklet(true);
    try {
      const res = await fetch('/api/volunteer/booklet');
      if (!res.ok) { toast.error('Ошибка при загрузке данных'); return; }
      const data = await res.json();
      const { user: u, projects, achievements } = data;

      const statusLabels: Record<string, string> = {
        recruiting: 'Набор', upcoming: 'Скоро', active: 'Активный',
        completed: 'Завершён', cancelled: 'Отменён', draft: 'Черновик',
      };

      const projectRows = projects.map((p: { title: string; categoryName: string; location: string; startDate: string; endDate: string; status: string; confirmedTasksCount: number; totalTasksCount: number }) => `
        <tr>
          <td>${p.title}</td>
          <td>${p.categoryName}</td>
          <td>${p.location}</td>
          <td>${new Date(p.startDate).toLocaleDateString('ru-RU')} — ${new Date(p.endDate).toLocaleDateString('ru-RU')}</td>
          <td>${statusLabels[p.status] ?? p.status}</td>
          <td>${p.confirmedTasksCount} / ${p.totalTasksCount}</td>
        </tr>`).join('');

      const achievementItems = achievements.map((a: { icon: string; name: string; description: string; createdAt: string }) => `
        <div class="achievement">
          <span class="ach-icon">${a.icon}</span>
          <div>
            <strong>${a.name}</strong>
            <div class="ach-desc">${a.description}</div>
            <div class="ach-date">Получено: ${new Date(a.createdAt).toLocaleDateString('ru-RU')}</div>
          </div>
        </div>`).join('');

      const html = `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"/>
<title>Волонтёрская книжка — ${u.firstName} ${u.lastName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; background: #fff; padding: 32px; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #00CC00; padding-bottom: 16px; margin-bottom: 24px; }
  .header-title { font-size: 22px; font-weight: bold; color: #00CC00; }
  .header-sub { font-size: 12px; color: #666; margin-top: 4px; }
  .logo { font-size: 28px; font-weight: bold; color: #00CC00; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 15px; font-weight: bold; color: #333; border-left: 4px solid #00CC00; padding-left: 10px; margin-bottom: 12px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
  .info-row { display: flex; flex-direction: column; }
  .info-label { font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 0.5px; }
  .info-value { font-size: 13px; font-weight: 500; color: #222; margin-top: 2px; }
  .stats { display: flex; gap: 16px; margin-bottom: 20px; }
  .stat-box { flex: 1; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; text-align: center; }
  .stat-num { font-size: 26px; font-weight: bold; color: #16a34a; }
  .stat-lbl { font-size: 10px; color: #666; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #f8faf8; text-align: left; padding: 8px 10px; border-bottom: 2px solid #e5e7eb; color: #555; font-weight: 600; }
  td { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; color: #333; }
  tr:last-child td { border-bottom: none; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; }
  .badge-completed { background: #dcfce7; color: #166534; }
  .badge-active { background: #dbeafe; color: #1e40af; }
  .badge-other { background: #f3f4f6; color: #6b7280; }
  .skills { display: flex; flex-wrap: wrap; gap: 6px; }
  .skill-tag { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 3px 10px; border-radius: 9999px; font-size: 11px; }
  .achievement { display: flex; gap: 12px; align-items: flex-start; padding: 10px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; margin-bottom: 8px; }
  .ach-icon { font-size: 24px; flex-shrink: 0; }
  .ach-desc { font-size: 11px; color: #666; margin-top: 2px; }
  .ach-date { font-size: 10px; color: #999; margin-top: 3px; }
  .footer { margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 12px; display: flex; justify-content: space-between; color: #999; font-size: 10px; }
  .no-data { color: #aaa; font-style: italic; font-size: 12px; padding: 8px 0; }
  @media print { body { padding: 16px; } @page { margin: 16mm; } }
</style></head>
<body>
<div class="header">
  <div>
    <div class="header-title">Волонтёрская книжка</div>
    <div class="header-sub">Официальный документ об участии в волонтёрской деятельности</div>
  </div>
  <div class="logo">ВолонтёрКР</div>
</div>

<div class="section">
  <div class="section-title">Личные данные</div>
  <div class="info-grid">
    <div class="info-row"><span class="info-label">ФИО</span><span class="info-value">${u.lastName} ${u.firstName}</span></div>
    <div class="info-row"><span class="info-label">Email</span><span class="info-value">${u.email}</span></div>
    <div class="info-row"><span class="info-label">Телефон</span><span class="info-value">${u.phone || '—'}</span></div>
    <div class="info-row"><span class="info-label">Город</span><span class="info-value">${u.city || '—'}</span></div>
    <div class="info-row"><span class="info-label">Волонтёр с</span><span class="info-value">${new Date(u.createdAt).toLocaleDateString('ru-RU')}</span></div>
    <div class="info-row"><span class="info-label">Рейтинг</span><span class="info-value">${u.ratingCount > 0 ? u.trustScore.toFixed(1) + ' / 5.0' : 'Нет оценок'}</span></div>
  </div>
</div>

<div class="stats">
  <div class="stat-box"><div class="stat-num">${u.completedProjects}</div><div class="stat-lbl">Завершено проектов</div></div>
  <div class="stat-box"><div class="stat-num">${u.completedTasks}</div><div class="stat-lbl">Выполнено задач</div></div>
  <div class="stat-box"><div class="stat-num">${achievements.length}</div><div class="stat-lbl">Достижений</div></div>
</div>

${u.skills.length > 0 ? `
<div class="section">
  <div class="section-title">Навыки</div>
  <div class="skills">${u.skills.map((s: string) => `<span class="skill-tag">${s}</span>`).join('')}</div>
</div>` : ''}

<div class="section">
  <div class="section-title">Участие в проектах</div>
  ${projects.length > 0 ? `
  <table>
    <thead><tr><th>Проект</th><th>Категория</th><th>Место</th><th>Период</th><th>Статус</th><th>Задачи</th></tr></thead>
    <tbody>${projectRows}</tbody>
  </table>` : '<div class="no-data">Проектов пока нет</div>'}
</div>

${achievements.length > 0 ? `
<div class="section">
  <div class="section-title">Достижения</div>
  ${achievementItems}
</div>` : ''}

<div class="footer">
  <span>Сформировано: ${new Date().toLocaleDateString('ru-RU')}</span>
  <span>ВолонтёрКР — платформа волонтёрства</span>
</div>
</body></html>`;

      const win = window.open('', '_blank');
      if (!win) { toast.error('Разрешите всплывающие окна в браузере'); return; }
      win.document.write(html);
      win.document.close();
      win.onload = () => { win.print(); };
    } catch {
      toast.error('Ошибка при формировании книжки');
    } finally {
      setGeneratingBooklet(false);
    }
  };

  // Skills state
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [addingSkill, setAddingSkill] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState('');

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/volunteer/profile');
      if (!res.ok) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      const userData = data.user;

      // verify role
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) { router.push('/login'); return; }
      const meData = await meRes.json();
      if (meData.user.role !== 'volunteer') { router.push('/dashboard'); return; }

      setUser({ ...userData, role: meData.user.role });
      setFormData({
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        city: userData.city,
        bio: userData.volunteerProfile?.bio ?? '',
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

  useEffect(() => {
    const fetchSkills = async () => {
      setSkillsLoading(true);
      try {
        const res = await fetch(`/api/skills?locale=${locale}`);
        if (res.ok) {
          const data = await res.json();
          setAllSkills(data.skills);
        }
      } finally {
        setSkillsLoading(false);
      }
    };
    fetchSkills();
  }, [locale]);

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
      const res = await fetch('/api/volunteer/profile', {
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

  const handleAddSkill = async () => {
    if (!selectedSkillId) return;
    setAddingSkill(true);
    try {
      const res = await fetch('/api/volunteer/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId: selectedSkillId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Ошибка при добавлении навыка');
        return;
      }
      toast.success('Навык добавлен');
      setSelectedSkillId('');
      await loadProfile();
    } catch {
      toast.error('Ошибка при добавлении навыка');
    } finally {
      setAddingSkill(false);
    }
  };

  const handleRemoveSkill = async (skillId: string) => {
    try {
      const res = await fetch(`/api/volunteer/skills?skillId=${skillId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Ошибка при удалении навыка');
        return;
      }
      toast.success('Навык удалён');
      await loadProfile();
    } catch {
      toast.error('Ошибка при удалении навыка');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  const availableSkillsToAdd = allSkills.filter(
    (s) => !user?.skills.some((us) => us.id === s.id)
  );

  const profile = user?.volunteerProfile;

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

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50">
        <VolunteerSidebar user={user} />
        <VolunteerNav user={user} />

        <DynamicContent maxWidth="max-w-5xl">
          {/* Profile Header */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6">
            {/* Green section: buttons top-right, name bottom-left after avatar */}
            <div className="bg-gradient-to-r from-[#00CC00] to-emerald-500 px-8 pt-4 pb-4 relative flex flex-col justify-end" style={{ minHeight: '7rem' }}>
              <div className="absolute top-4 right-8 flex gap-3">
                <button
                  onClick={handleDownloadBooklet}
                  disabled={generatingBooklet}
                  className="flex items-center gap-2 px-5 py-2 bg-white/20 text-white rounded-full font-medium hover:bg-white/30 transition-colors disabled:opacity-60 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {generatingBooklet ? (t.profile?.bookletGenerating || 'Формирование...') : (t.profile?.bookletPdf || 'Книжка PDF')}
                </button>
                <button
                  onClick={handleLogout}
                  className="px-5 py-2 bg-white/20 text-white rounded-full font-medium hover:bg-white/30 transition-colors text-sm"
                >
                  {t.profile?.logout || 'Выйти'}
                </button>
              </div>
              <div className="pl-40">
                <h1 className="text-3xl font-bold text-white leading-tight">
                  {user.firstName} {user.lastName}
                </h1>
              </div>
            </div>

            {/* White section — avatar + all personal data */}
            <div className="relative px-8 pb-8">
              {/* Avatar — left side, centered at green/white boundary */}
              <div className="absolute -top-16 left-8">
                <div className="relative w-32 h-32">
                  <label className="relative group cursor-pointer block w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.firstName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#00CC00] flex items-center justify-center text-white font-bold text-4xl">
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
                    <input type="file" accept="image/jpeg,image/png,image/jpg,image/webp" className="hidden" disabled={uploadingAvatar} onChange={handleAvatarChange} />
                  </label>

                  {/* Pencil button */}
                  <div className="absolute bottom-1 right-1 z-10 group/pencil">
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="w-8 h-8 bg-white rounded-full shadow-md border border-gray-200 flex items-center justify-center transition-all hover:bg-[#00CC00] hover:border-[#00CC00]"
                    >
                      <svg className="w-3.5 h-3.5 text-gray-600 group-hover/pencil:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <div className="absolute bottom-full right-0 mb-2 pointer-events-none opacity-0 group-hover/pencil:opacity-100 transition-opacity">
                      <span className="block px-2.5 py-1 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap shadow-lg">
                        {t.profile?.editProfile || 'Редактировать'}
                      </span>
                      <span className="block w-0 h-0 ml-auto mr-3 border-4 border-transparent border-t-gray-900" />
                    </div>
                  </div>
                </div>
              </div>

              {/* All personal data, shifted right of avatar */}
              <div className="pt-5 pl-40">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-28 gap-y-3 mb-4">
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Email</div>
                    <div className="text-gray-800 font-medium text-sm">{user.email}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{t.profile?.phone || 'Телефон'}</div>
                    <div className="text-gray-800 font-medium text-sm">{user.phone || <span className="text-gray-400 italic">Не указан</span>}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{t.profile?.city || 'Город'}</div>
                    <div className="text-gray-800 font-medium text-sm">{user.city || <span className="text-gray-400 italic">Не указан</span>}</div>
                  </div>
                  {profile?.bio?.trim() && (
                    <div className="sm:col-span-2">
                      <div className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{t.profile?.bio || 'О себе'}</div>
                      <div className="text-gray-700 text-sm">{profile.bio}</div>
                    </div>
                  )}
                </div>
                <StarRating
                  score={Number(profile?.trustScore ?? 0)}
                  count={profile?.ratingCount ?? 0}
                  locale={locale}
                  noRatingsLabel={t.profile?.noRatings || 'Нет оценок'}
                  ratingsCountLabel={t.profile?.ratingsCount || 'оценок'}
                />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{profile?.completedProjects ?? 0}</div>
                  <div className="text-sm text-gray-600">{t.profile?.completedProjects || 'Проектов завершено'}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{profile?.completedTasks ?? 0}</div>
                  <div className="text-sm text-gray-600">{t.profile?.completedTasks || 'Задач выполнено'}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {profile?.ratingCount ?? 0 > 0 ? Number(profile?.trustScore ?? 0).toFixed(1) : '—'}
                  </div>
                  <div className="text-sm text-gray-600">{t.profile?.reliabilityScore || 'Средний рейтинг'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{t.profile?.skills || 'Навыки'}</h2>

            {user.skills.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-6">
                {user.skills.map((skill) => (
                  <span key={skill.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-800 rounded-full text-sm font-medium border border-green-200">
                    {skill.name}
                    <button
                      onClick={() => handleRemoveSkill(skill.id)}
                      className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-green-200 transition-colors text-green-600 hover:text-green-900"
                      title={t.profile?.removeSkill || 'Удалить навык'}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 italic text-sm mb-6">{t.profile?.noSkillsAdded || 'Навыки не добавлены'}</p>
            )}

            {!skillsLoading && availableSkillsToAdd.length > 0 && (
              <div className="flex items-center gap-3">
                <CustomSelect
                  className="flex-1"
                  value={selectedSkillId}
                  onChange={setSelectedSkillId}
                  placeholder={t.profile?.selectSkillPlaceholder || 'Выберите навык для добавления...'}
                  options={availableSkillsToAdd.map((skill) => ({ value: skill.id, label: skill.name }))}
                />
                <button
                  onClick={handleAddSkill}
                  disabled={!selectedSkillId || addingSkill}
                  className="px-5 py-2.5 bg-[#00CC00] text-white rounded-xl text-sm font-medium hover:bg-[#00b300] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {addingSkill ? (t.profile?.addingSkill || 'Добавление...') : (t.profile?.addSkill || 'Добавить')}
                </button>
              </div>
            )}

            {skillsLoading && (
              <div className="text-sm text-gray-400">{t.profile?.loadingSkills || 'Загрузка навыков...'}</div>
            )}
          </div>

          {/* Rating detail */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{t.profile?.ratingTitle || 'Рейтинг'}</h2>

            {(profile?.ratingCount ?? 0) > 0 ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8">
                <div className="text-center">
                  <div className="text-6xl font-bold text-gray-900 mb-1">
                    {Number(profile?.trustScore ?? 0).toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-500">{t.profile?.outOfFive || 'из 5.0'}</div>
                </div>
                <div className="flex-1">
                  <StarRating
                    score={Number(profile?.trustScore ?? 0)}
                    count={profile?.ratingCount ?? 0}
                    locale={locale}
                    noRatingsLabel={t.profile?.noRatings || 'Нет оценок'}
                    ratingsCountLabel={t.profile?.ratingsCount || 'оценок'}
                  />
                  <p className="mt-3 text-sm text-gray-600">
                    {t.profile?.ratingDescription || 'Рейтинг формируется на основе оценок от организаторов после подтверждения выполненных задач. Чем выше рейтинг, тем больше доверия к волонтёру.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.profile?.ratingNotFormed || 'Рейтинг пока не сформирован'}</h3>
                <p className="text-gray-500 text-sm">
                  {t.profile?.ratingNotFormedHint || 'Выполняйте задачи и получайте оценки от организаторов, чтобы повысить свой рейтинг.'}
                </p>
              </div>
            )}
          </div>
        </DynamicContent>

        <AiSupportButton />
      </div>

      {/* Edit Profile Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditing(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">{t.profile?.editProfile || 'Редактирование профиля'}</h2>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.profile?.firstName || 'Имя'}</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.profile?.lastName || 'Фамилия'}</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.profile?.phone || 'Телефон'}</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.profile?.city || 'Город'}</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.profile?.bio || 'О себе'}</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent resize-none"
                  placeholder="Расскажите о себе, своих интересах..."
                />
              </div>

              {/* Modal footer */}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-[#00CC00] text-white rounded-xl font-medium hover:bg-[#00b300] transition-colors disabled:opacity-60"
                >
                  {saving ? (t.common?.saving || 'Сохранение...') : (t.profile?.saveChanges || 'Сохранить')}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  {t.common?.cancel || 'Отменить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SidebarProvider>
  );
}
