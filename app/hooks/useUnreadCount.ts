'use client';

import { useState, useEffect } from 'react';

export function useUnreadCount() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        // Получаем групповые чаты
        const groupChatsRes = await fetch('/api/chats');
        let groupUnread = 0;
        if (groupChatsRes.ok) {
          const data = await groupChatsRes.json();
          groupUnread = data.chats.reduce((sum: number, chat: any) => sum + (chat.unreadCount || 0), 0);
        }

        // Получаем личные чаты
        const directChatsRes = await fetch('/api/direct-chats');
        let directUnread = 0;
        if (directChatsRes.ok) {
          const data = await directChatsRes.json();
          directUnread = data.chats.reduce((sum: number, chat: any) => sum + (chat.unreadCount || 0), 0);
        }

        setUnreadCount(groupUnread + directUnread);
      } catch (error) {
        console.error('Ошибка при получении количества непрочитанных:', error);
      }
    };

    fetchUnreadCount();
    
    // Обновляем каждые 3 секунды для быстрого отображения новых сообщений
    const interval = setInterval(fetchUnreadCount, 3000);
    
    return () => clearInterval(interval);
  }, []);

  return unreadCount;
}
