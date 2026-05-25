'use client';

import { useState, useEffect, useRef } from 'react';

export function useUnreadCount() {
  const [unreadCount, setUnreadCount] = useState(0);
  // Флаг — прекратить опрос если пользователь не авторизован
  const unauthorizedRef = useRef(false);

  useEffect(() => {
    unauthorizedRef.current = false;

    const fetchUnreadCount = async () => {
      // Не делаем запрос если уже получили 401
      if (unauthorizedRef.current) return;

      try {
        const [groupChatsRes, directChatsRes] = await Promise.all([
          fetch('/api/chats'),
          fetch('/api/direct-chats'),
        ]);

        // Если не авторизован — останавливаем опрос
        if (groupChatsRes.status === 401 || directChatsRes.status === 401) {
          unauthorizedRef.current = true;
          setUnreadCount(0);
          return;
        }

        let groupUnread = 0;
        if (groupChatsRes.ok) {
          const data = await groupChatsRes.json();
          groupUnread = data.chats?.reduce(
            (sum: number, chat: any) => sum + (chat.unreadCount || 0),
            0
          ) ?? 0;
        }

        let directUnread = 0;
        if (directChatsRes.ok) {
          const data = await directChatsRes.json();
          directUnread = data.chats?.reduce(
            (sum: number, chat: any) => sum + (chat.unreadCount || 0),
            0
          ) ?? 0;
        }

        setUnreadCount(groupUnread + directUnread);
      } catch {
        // Сеть недоступна или компонент размонтирован — молча игнорируем
      }
    };

    fetchUnreadCount();

    // 30 секунд достаточно для счётчика непрочитанных
    const interval = setInterval(fetchUnreadCount, 30_000);

    return () => clearInterval(interval);
  }, []);

  return unreadCount;
}
