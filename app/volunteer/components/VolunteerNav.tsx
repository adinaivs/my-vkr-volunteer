'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import NavLanguageSwitcher from '@/app/i18n/NavLanguageSwitcher';
import { Tooltip } from '@/app/components/Tooltip';

interface User {
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

interface VolunteerNavProps {
  user: User;
}

export default function VolunteerNav({ user }: VolunteerNavProps) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  // Загружаем счётчик непрочитанных уведомлений
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/notifications?countOnly=true');
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.count ?? 0);
        }
      } catch {}
    };

    fetchCount();
    // Обновляем каждые 60 секунд
    const interval = setInterval(fetchCount, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Сбрасываем счётчик когда открыта страница уведомлений
  useEffect(() => {
    if (pathname === '/volunteer/notifications') setUnreadCount(0);
  }, [pathname]);

  return (
    <header className="bg-white fixed top-0 left-0 right-0 z-50 lg:mx-2 lg:mt-2 lg:rounded-2xl shadow-xl border border-gray-300">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/volunteer/dashboard" className="flex items-center gap-2">
            <img src="/logo.png" alt="ВолонтёрКР" className="w-8 h-8 object-contain" />
            <div className="text-lg font-bold text-gray-900">
              Волонтёр<span className="text-[#00CC00]">КР</span>
            </div>
          </Link>

          {/* Right Side */}
          <div className="flex items-center gap-1">
            {/* Language Switcher */}
            <NavLanguageSwitcher />

            {/* Уведомления */}
            <Tooltip text="Уведомления" position="bottom">
            <Link
              href="/volunteer/notifications"
              className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
            </Tooltip>

            {/* Settings */}
            <Tooltip text="Настройки" position="bottom">
            <Link
              href="/volunteer/settings"
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
            </Tooltip>

            {/* User Profile */}
            <Link href="/volunteer/profile" className="flex items-center gap-2 ml-1 hover:opacity-80 transition-opacity">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.firstName} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#00CC00] flex items-center justify-center text-white font-bold text-sm">
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </div>
              )}
              <span className="text-sm font-medium text-gray-700 hidden sm:block">
                {user.firstName} {user.lastName}
              </span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
