'use client';

import { useSidebar } from '@/app/contexts/SidebarContext';
import { ReactNode } from 'react';

interface DynamicContentProps {
  children: ReactNode;
  className?: string;
  maxWidth?: string;
}

export default function DynamicContent({ children, className = '', maxWidth }: DynamicContentProps) {
  const { collapsed } = useSidebar();

  return (
    <main 
      className={`transition-all duration-300 px-4 sm:px-6 lg:px-8 pt-20 lg:pt-[88px] pb-20 lg:pb-8 ${
        collapsed ? 'lg:ml-[88px]' : 'lg:ml-[272px]'
      } ${maxWidth ? maxWidth : ''} ${className}`}
    >
      {children}
    </main>
  );
}
