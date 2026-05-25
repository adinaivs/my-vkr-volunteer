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
  const { collapsed, setCollapsed } = useSidebar();
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
      icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
    },
    {
      href: '/organizer/reports',
      label: t.nav?.reports || 'Отчёты',
      icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    },
    {
      href: '/organizer/profile',
      label: t.nav?.profile || 'Профиль',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
    },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col fixed left-2 bottom-2 bg-white rounded-2xl shadow-xl border border-gray-300 transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`} style={{ top: '80px' }}>
        {/* Navigation */}
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
              {item.href === '/organizer/chats' && unreadCount > 0 && (
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

        {/* User Profile */}
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
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-xs text-gray-500">{t.nav?.role || 'Организатор'}</div>
                </div>
              )}
            </Link>

            {/* Collapse Toggle */}
            {!collapsed && (
              <Tooltip text="Свернуть" position="top">
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
              </Tooltip>
            )}
          </div>

          {/* Collapse Toggle for collapsed state */}
          {collapsed && (
            <Tooltip text="Развернуть" position="right" wrapperClassName="block">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="mt-2 w-full flex items-center justify-center p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
            </Tooltip>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 shadow-xl z-50">
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-3 px-2 transition-colors relative ${
                isActive(item.href)
                  ? 'text-[#00CC00]'
                  : 'text-gray-600'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              <span className="text-xs font-medium">{item.label.split(' ')[0]}</span>
              {item.href === '/organizer/chats' && unreadCount > 0 && (
                <span className="absolute top-1 right-0 w-2 h-2 bg-[#00CC00] rounded-full border-2 border-white"></span>
              )}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
