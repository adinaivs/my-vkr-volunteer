'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface AnnouncementContextType {
  bannerVisible: boolean;
  setBannerVisible: (v: boolean) => void;
}

const AnnouncementContext = createContext<AnnouncementContextType>({
  bannerVisible: false,
  setBannerVisible: () => {},
});

export function AnnouncementProvider({ children }: { children: ReactNode }) {
  const [bannerVisible, setBannerVisible] = useState(false);
  return (
    <AnnouncementContext.Provider value={{ bannerVisible, setBannerVisible }}>
      {children}
    </AnnouncementContext.Provider>
  );
}

export const useAnnouncement = () => useContext(AnnouncementContext);
