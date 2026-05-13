'use client';

import { useAnnouncementHeight } from './useAnnouncementHeight';

/**
 * Хук для вычисления отступа контента с учетом высоты баннера объявлений
 * @param baseHeaderHeight - базовая высота хедера в пикселях (по умолчанию 64px)
 * @returns объект со стилями для применения к контенту
 */
export function useContentPadding(baseHeaderHeight: number = 64) {
  const announcementHeight = useAnnouncementHeight();
  const totalPadding = baseHeaderHeight + announcementHeight + 32; // +32px дополнительный отступ

  return {
    paddingTop: `${totalPadding}px`,
  };
}
