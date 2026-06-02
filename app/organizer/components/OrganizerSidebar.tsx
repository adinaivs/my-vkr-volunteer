'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/app/contexts/SidebarContext';
import { useUnreadCount } from '@/app/hooks/useUnreadCount';
import { useTranslation } from '@/app/i18n/useTranslation';
import { Tooltip } from '@/app/components/Tooltip';

interface User {
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

interface OrganizerSidebarProps {
  user: User;
}

export default function OrganizerSidebar({ user }: OrganizerSidebarProps) {
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar();
  const pathname = usePathname();
  const unreadCount = useUnreadCount();
  const { t } = useTranslation('organizer');

  const navItems = [
    {
      href: '/organizer/dashboard',
      label: t.nav?.dashboard || 'Дашборд',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
    },
    {
      href: '/organizer/projects',
      label: t.nav?.projects || 'Мои проекты',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    },
    {
      href: '/organizer/volunteers',
      label: t.nav?.volunteers || 'Волонтёры',
      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z'
    },
    {
      href: '/organizer/chats',
      label: t.nav?.messages || 'Сообщения',
      icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
      badge: true
    },
    {
      href: '/organizer/reports',
      label: t.nav?.reports || 'Отчёты',
      icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    },
    {
      href: '/organizer/payments',
      label: t.nav?.payments || 'Платежи',
      icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'
    },
    {
      href: '/organizer/profile',
      label: t.nav?.profile || 'Профиль',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
    },
  ];

  const isActive = (href: string) => pathname === href;

  const currentItem = navItems.find(item => isActive(item.href));

  return (
    <>
      {/* ── DESKTOP SIDEBAR ── */}
      <aside
        className={`hidden lg:flex flex-col fixed left-2 bottom-2 bg-white rounded-2xl shadow-xl border border-gray-300 transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
        style={{ top: '80px' }}
      >
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto pt-6">
          {navItems.map((item) => (
            <Tooltip key={item.href} text={collapsed ? item.label : ''} position="right" wrapperClassName="block">
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative ${
                  isActive(item.href)
                    ? 'bg-[#00CC00] text-white shadow-lg shadow-[#00CC00]/30'
                    : 'text-gray-600 hover:bg-gray-100'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                {!collapsed && <span className="font-medium">{item.label}</span>}
                {item.badge && unreadCount > 0 && (
                  <span className={`absolute ${collapsed ? 'top-2 right-2' : 'right-3'} flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full ${
                    isActive(item.href) ? 'bg-white text-[#00CC00]' : 'bg-[#00CC00] text-white'
                  }`}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            </Tooltip>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <Link
              href="/organizer/profile"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 transition-colors flex-1 min-w-0"
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.firstName} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#00CC00] flex items-center justify-center text-white font-bold flex-shrink-0">
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </div>
              )}
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{user.firstName} {user.lastName}</div>
                  <div className="text-xs text-gray-500">{t.nav?.role || 'Организатор'}</div>
                </div>
              )}
            </Link>
            {!collapsed && (
              <Tooltip text="Свернуть" position="top">
                <button onClick={() => setCollapsed(true)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>
              </Tooltip>
            )}
          </div>
          {collapsed && (
            <Tooltip text="Развернуть" position="right" wrapperClassName="block">
              <button onClick={() => setCollapsed(false)} className="mt-2 w-full flex items-center justify-center p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
            </Tooltip>
          )}
        </div>
      </aside>

      {/* ── MOBILE: нижняя панель с бургером ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        {/* Панель */}
        <div className="bg-white border-t border-gray-200 shadow-xl px-6 py-3 flex items-center justify-between">
          {/* Текущая страница */}
          <div className="flex items-center gap-2">
            {currentItem && (
              <svg className="w-5 h-5 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={currentItem.icon} />
              </svg>
            )}
            <span className="text-sm font-semibold text-gray-800">
              {currentItem?.label || 'Меню'}
            </span>
          </div>

          {/* Бадж + Бургер */}
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full bg-red-500 text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex items-center gap-2 bg-[#00CC00] text-white px-4 py-2 rounded-full font-medium text-sm shadow-lg shadow-[#00CC00]/30 transition-all active:scale-95"
            >
              {mobileOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
              <span>{mobileOpen ? 'Закрыть' : 'Меню'}</span>
            </button>
          </div>
        </div>

        {/* Слайд-ап меню */}
        <div
          className={`absolute bottom-full left-0 right-0 bg-white rounded-t-3xl shadow-2xl border-t border-gray-100 transition-all duration-300 ease-out ${
            mobileOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
          }`}
        >
          {/* Ручка */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          {/* Профиль */}
          <div className="px-5 py-3 border-b border-gray-100">
            <Link
              href="/organizer/profile"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3"
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.firstName} className="w-11 h-11 rounded-full object-cover" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-[#00CC00] flex items-center justify-center text-white font-bold">
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </div>
              )}
              <div>
                <div className="font-semibold text-gray-900">{user.firstName} {user.lastName}</div>
                <div className="text-xs text-gray-500">{t.nav?.role || 'Организатор'}</div>
              </div>
            </Link>
          </div>

          {/* Пункты навигации */}
          <nav className="px-3 py-3 grid grid-cols-2 gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all relative ${
                  isActive(item.href)
                    ? 'bg-[#00CC00] text-white shadow-md shadow-[#00CC00]/30'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                <span className="text-sm font-medium">{item.label}</span>
                {item.badge && unreadCount > 0 && (
                  <span className={`absolute top-2 right-2 min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full flex items-center justify-center ${
                    isActive(item.href) ? 'bg-white text-[#00CC00]' : 'bg-[#00CC00] text-white'
                  }`}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          {/* Выход */}
          <div className="px-3 pb-5 pt-1 border-t border-gray-100 mt-1">
            <button
              onClick={async () => {
                setMobileOpen(false);
                await fetch('/api/auth/logout', { method: 'POST' });
                window.location.href = '/login';
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="text-sm font-medium">Выйти из аккаунта</span>
            </button>
          </div>
        </div>

        {/* Затемнение фона */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/40 -z-10"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </div>
    </>
  );
}
