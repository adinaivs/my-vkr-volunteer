'use client';

import { useState, useEffect } from 'react';

export function useAnnouncementHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const updateHeight = () => {
      const banner = document.getElementById('announcement-banner');
      setHeight(banner ? banner.offsetHeight : 0);
    };

    updateHeight();
    
    // Наблюдаем за изменениями в DOM
    const observer = new MutationObserver(updateHeight);
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('resize', updateHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  return height;
}
