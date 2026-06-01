'use client';

import { useSidebar } from '@/app/contexts/SidebarContext';
import { useAnnouncement } from '@/app/contexts/AnnouncementContext';
import AnnouncementBanner from '@/app/components/AnnouncementBanner';
import { ReactNode } from 'react';

interface DynamicContentProps {
  children: ReactNode;
  className?: string;
  maxWidth?: string;
}

export default function DynamicContent({ children, className = '', maxWidth }: DynamicContentProps) {
  const { collapsed } = useSidebar();
  const { bannerVisible } = useAnnouncement();

  // Баннер ~48px — добавляем отступ сверху когда он видим
  const ptClass = bannerVisible
    ? 'pt-[68px] lg:pt-[136px]'
    : 'pt-20 lg:pt-[88px]';

  // Класс левого отступа баннера совпадает с отступом контента
  const bannerLeftClass = collapsed ? 'lg:left-[88px]' : 'lg:left-[272px]';

  return (
    <>
      <AnnouncementBanner leftClass={bannerLeftClass} />
      <main
        className={`transition-all duration-300 px-4 sm:px-6 lg:px-8 ${ptClass} pb-20 lg:pb-8 ${
          collapsed ? 'lg:ml-[88px]' : 'lg:ml-[272px]'
        } ${maxWidth ? maxWidth : ''} ${className}`}
      >
        {children}
      </main>
    </>
  );
}
