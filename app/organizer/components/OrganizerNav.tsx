'use client';

import Link from 'next/link';
import NavLanguageSwitcher from '@/app/i18n/NavLanguageSwitcher';
import { Tooltip } from '@/app/components/Tooltip';

interface User {
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

interface OrganizerNavProps {
  user: User;
}

export default function OrganizerNav({ user }: OrganizerNavProps) {
  return (
    <header className="bg-white fixed top-0 left-0 right-0 z-50 lg:mx-2 lg:mt-2 lg:rounded-2xl shadow-xl border border-gray-300">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo - всегда показывается */}
          <Link href="/organizer/dashboard" className="flex items-center gap-2">
            <img src="/logo.png" alt="ВолонтёрКР" className="w-8 h-8 object-contain" />
            <div className="text-lg font-bold text-gray-900">
              Волонтёр<span className="text-[#00CC00]">КР</span>
            </div>
          </Link>

          {/* Right Side - User Menu & Settings */}
          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <NavLanguageSwitcher />

            {/* Settings Button */}
            <Tooltip text="Настройки" position="bottom">
            <button
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            </Tooltip>

            {/* User Profile */}
            <Link href="/organizer/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
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
