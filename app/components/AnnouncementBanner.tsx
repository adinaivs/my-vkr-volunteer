'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAnnouncement } from '@/app/contexts/AnnouncementContext';

interface Props {
  leftClass?: string; // Tailwind-класс для left (только для десктопа)
}

export default function AnnouncementBanner({ leftClass = '' }: Props) {
  const pathname = usePathname();
  const [message, setMessage] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const { setBannerVisible } = useAnnouncement();

  useEffect(() => {
    if (pathname.startsWith('/admin')) return;
    fetch('/api/announcement')
      .then((r) => r.json())
      .then((d) => setMessage(d.announcement || null))
      .catch(() => {});
  }, [pathname]);

  const visible = !!message && !dismissed && !pathname.startsWith('/admin');

  useEffect(() => {
    setBannerVisible(visible);
    return () => setBannerVisible(false);
  }, [visible, setBannerVisible]);

  if (!visible) return null;

  const hasFixedHeader =
    pathname.startsWith('/volunteer') ||
    pathname.startsWith('/organizer');

  const topClass = hasFixedHeader ? 'top-16 lg:top-[76px]' : 'top-0';

  return (
    <div className={`fixed ${topClass} left-0 right-0 ${leftClass} z-40 bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-start gap-3 shadow-sm transition-all duration-300`}>
      <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
      <p className="flex-1 text-sm text-amber-800">{message}</p>
      <button onClick={() => setDismissed(true)} className="text-amber-500 hover:text-amber-700 transition-colors shrink-0">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
