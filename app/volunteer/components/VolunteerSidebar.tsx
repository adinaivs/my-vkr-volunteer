'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/app/contexts/SidebarContext';

interface User {
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

interface VolunteerSidebarProps {
  user: User;
}

export default function VolunteerSidebar({ user }: VolunteerSidebarProps) {
  const { collapsed, setCollapsed } = useSidebar();
  const pathname = usePathname();

  const navItems = [
    {
      href: '/volunteer/dashboard',
      label: 'Главная',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
    },
    {
      href: '/volunteer/projects',
      label: 'Каталог проектов',
      icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
    },
    {
      href: '/volunteer/my-projects',
      label: 'Мои проекты',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    },
    {
      href: '/volunteer/chats',
      label: 'Чаты',
      icon: 'M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z'
    },
    {
      href: '/volunteer/profile',
      label: 'Профиль',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
    },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col fixed left-2 bottom-2 bg-white rounded-2xl shadow-xl border border-gray-300 transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`} style={{ top: '80px' }}>
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive(item.href)
                  ? 'bg-[#00CC00] text-white shadow-lg shadow-[#00CC00]/30'
                  : 'text-gray-600 hover:bg-gray-100'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? item.label : ''}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <Link 
              href="/volunteer/profile" 
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
                  <div className="text-xs text-gray-500">Волонтёр</div>
                </div>
              )}
            </Link>
            
            {/* Collapse Toggle */}
            {!collapsed && (
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                title="Свернуть"
              >
                <svg 
                  className="w-5 h-5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
            )}
          </div>
          
          {/* Collapse Toggle for collapsed state */}
          {collapsed && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="mt-2 w-full flex items-center justify-center p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Развернуть"
            >
              <svg 
                className="w-5 h-5 rotate-180" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
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
              className={`flex flex-col items-center gap-1 py-3 px-4 transition-colors ${
                isActive(item.href)
                  ? 'text-[#00CC00]'
                  : 'text-gray-600'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              <span className="text-xs font-medium">{item.label.split(' ')[0]}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
