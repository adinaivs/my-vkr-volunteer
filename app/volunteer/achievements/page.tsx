'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import VolunteerNav from '../components/VolunteerNav';
import VolunteerSidebar from '../components/VolunteerSidebar';
import AiSupportButton from '@/app/components/AiSupportButton';
import DynamicContent from '@/app/components/DynamicContent';
import { SidebarProvider } from '@/app/contexts/SidebarContext';
import { useTranslation } from '@/app/i18n/useTranslation';
import { SvgIcon } from '@/app/components/SvgIcon';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

interface Partner {
  id: string;
  name: string;
  logoUrl?: string | null;
  contactInfo?: string | null;
}

interface Reward {
  id: string;
  rewardText: string;
  validForDays: number;
  partner: Partner;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  conditionType: string;
  conditionValue: number;
  translations: { locale: string; name: string; description: string }[];
  rewards: Reward[];
}

interface UserAchievement {
  id: string;
  rewardText: string;
  expiresAt: string;
  createdAt: string;
  achievement: Achievement;
}

export default function VolunteerAchievementsPage() {
  const router = useRouter();
  const { t, locale } = useTranslation('volunteer');

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString(locale === 'kg' ? 'ky-KG' : 'ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });

  const daysLeftLabel = (days: number): string => {
    if (locale === 'kg') return `${t.achievements?.daysLeft || 'Дагы'} ${days} ${t.achievements?.day1 || 'күн'}`;
    const mod10 = days % 10;
    const mod100 = days % 100;
    let word = t.achievements?.day5 || 'дней';
    if (mod10 === 1 && mod100 !== 11) word = t.achievements?.day1 || 'день';
    else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) word = t.achievements?.day2 || 'дня';
    return `${t.achievements?.daysLeft || 'Ещё'} ${days} ${word}`;
  };

  const getAchName = (ach: Achievement) =>
    ach.translations.find((tr) => tr.locale === locale)?.name ||
    ach.translations.find((tr) => tr.locale === 'ru')?.name ||
    ach.name;

  const getAchDesc = (ach: Achievement) =>
    ach.translations.find((tr) => tr.locale === locale)?.description ||
    ach.translations.find((tr) => tr.locale === 'ru')?.description ||
    ach.description;
  const [user, setUser] = useState<User | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'active' | 'expired'>('active');

  useEffect(() => {
    const init = async () => {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) { router.push('/login'); return; }
        const { user: me } = await meRes.json();
        if (me.role !== 'volunteer') { router.push('/dashboard'); return; }
        setUser(me);

        const achRes = await fetch('/api/volunteer/achievements');
        if (achRes.ok) {
          const data = await achRes.json();
          setAchievements(data.achievements);
        }
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  const now = new Date();
  const active = achievements.filter((a) => new Date(a.expiresAt) > now);
  const expired = achievements.filter((a) => new Date(a.expiresAt) <= now);
  const displayed = tab === 'active' ? active : expired;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00]" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50">
        <VolunteerSidebar user={user} />
        <VolunteerNav user={user} />

        <DynamicContent maxWidth="max-w-4xl">
          {/* Заголовок */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{t.achievements?.title || 'Достижения'}</h1>
            <p className="text-gray-500 mt-1 text-sm">{t.achievements?.noAchievementsHint || 'Ваши награды и достижения на платформе'}</p>
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
              <div className="text-3xl font-bold text-[#00CC00]">{achievements.length}</div>
              <div className="text-sm text-gray-500 mt-1">{t.achievements?.earned || 'Получено'}</div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
              <div className="text-3xl font-bold text-blue-600">{active.length}</div>
              <div className="text-sm text-gray-500 mt-1">{t.achievements?.progress || 'Активных'}</div>
            </div>
            <div className="col-span-2 md:col-span-1 bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
              <div className="text-3xl font-bold text-gray-400">{expired.length}</div>
              <div className="text-sm text-gray-500 mt-1">{t.achievements?.locked || 'Не получено'}</div>
            </div>
          </div>

          {/* Вкладки */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setTab('active')}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-colors ${
                tab === 'active' ? 'bg-[#00CC00] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {t.achievements?.tabActive || 'Активные'} ({active.length})
            </button>
            <button
              onClick={() => setTab('expired')}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-colors ${
                tab === 'expired' ? 'bg-gray-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {t.achievements?.tabExpired || 'Истёкшие'} ({expired.length})
            </button>
          </div>

          {/* Список достижений */}
          {displayed.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="text-5xl mb-4">{tab === 'active' ? '🏆' : '📋'}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {tab === 'active' ? (t.achievements?.noAchievements || 'Нет активных достижений') : (t.achievements?.noAchievementsExpired || 'Нет истёкших достижений')}
              </h3>
              <p className="text-gray-500 text-sm">
                {tab === 'active'
                  ? (t.achievements?.noAchievementsHint || 'Участвуйте в проектах и выполняйте задачи, чтобы получать достижения')
                  : (t.achievements?.noAchievementsExpiredHint || 'Здесь будут отображаться достижения с истёкшим сроком действия')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayed.map((ua) => {
                const isExpired = new Date(ua.expiresAt) <= now;
                const days = Math.ceil((new Date(ua.expiresAt).getTime() - now.getTime()) / 86400000);
                const hasRewards = !isExpired && ua.achievement.rewards.length > 0;

                return (
                  <div key={ua.id} className={`bg-white rounded-2xl border overflow-hidden transition-all ${isExpired ? 'border-gray-100 opacity-60' : 'border-gray-200 hover:shadow-md'}`}>
                    <div className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden ${isExpired ? 'bg-gray-100 text-gray-400' : 'bg-amber-50 text-amber-500'}`}>
                          <SvgIcon iconKey={ua.achievement.icon} className="w-7 h-7" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-gray-900 text-sm">{getAchName(ua.achievement)}</h3>
                            {isExpired ? (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-400 text-xs rounded-full">{t.achievements?.statusExpired || 'Истёк'}</span>
                            ) : days <= 30 ? (
                              <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full font-medium">
                                {daysLeftLabel(days)}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">{t.achievements?.statusActive || 'Активно'}</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{getAchDesc(ua.achievement)}</p>
                          <div className="flex gap-3 mt-1 text-xs text-gray-400">
                            <span>{t.achievements?.receivedAt || 'Получено'} {fmtDate(ua.createdAt)}</span>
                            <span className={isExpired ? 'text-red-400' : ''}>{t.achievements?.validUntil || 'До'} {fmtDate(ua.expiresAt)}</span>
                          </div>
                        </div>
                      </div>
                      {hasRewards && (
                        <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
                          {ua.achievement.rewards.map((reward) => (
                            <div key={reward.id} className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {reward.partner.logoUrl ? (
                                  <img src={reward.partner.logoUrl} alt={reward.partner.name} className="w-full h-full object-contain" />
                                ) : (
                                  <span className="text-xs font-bold text-gray-400">{reward.partner.name[0]}</span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-800">{reward.partner.name}</p>
                                <p className="text-xs text-gray-500 truncate">{reward.rewardText}</p>
                              </div>
                              <span className="flex-shrink-0 text-xs font-medium text-[#00CC00] bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">
                                {reward.validForDays} {t.achievements?.rewardDays || 'дн.'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DynamicContent>

        <AiSupportButton />
      </div>
    </SidebarProvider>
  );
}
