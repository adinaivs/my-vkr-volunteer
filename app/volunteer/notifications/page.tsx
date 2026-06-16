'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import VolunteerNav from '../components/VolunteerNav';
import { Tooltip } from '@/app/components/Tooltip';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

interface Notification {
  id: string;
  type: 'comment_reply' | 'new_project' | 'application_status' | 'project_overdue';
  title: string;
  body: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

function groupByDate(notifications: Notification[]) {
  const groups: Record<string, Notification[]> = {};
  for (const n of notifications) {
    const date = new Date(n.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    let label: string;
    if (date.toDateString() === today.toDateString()) {
      label = 'Сегодня';
    } else if (date.toDateString() === yesterday.toDateString()) {
      label = 'Вчера';
    } else {
      label = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  }
  return groups;
}

const typeIcon: Record<string, ReactElement> = {
  comment_reply: (
    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
    </svg>
  ),
  new_project: (
    <svg className="w-5 h-5 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  application_status: (
    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  project_overdue: (
    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const typeBg: Record<string, string> = {
  comment_reply:      'bg-blue-50',
  new_project:        'bg-green-50',
  application_status: 'bg-orange-50',
  project_overdue:    'bg-red-50',
};

export default function NotificationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) { router.push('/login'); return; }
        const data = await res.json();
        if (data.user?.role !== 'volunteer') { router.push('/login'); return; }
        setUser(data.user);
      } catch { router.push('/login'); return; }

      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
        }
      } catch {}

      setLoading(false);
    };
    init();
  }, []);

  const handleClick = async (notification: Notification) => {
    if (!notification.isRead) {
      // Оптимистично помечаем прочитанным
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
      );
      await fetch(`/api/notifications/${notification.id}`, { method: 'PATCH' }).catch(() => {});
    }
    if (notification.link) router.push(notification.link);
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    await fetch('/api/notifications', { method: 'PATCH' }).catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setMarkingAll(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
    await fetch(`/api/notifications/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const groups = groupByDate(notifications);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#00CC00]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-50">
      {user && <VolunteerNav user={user} />}

      <div className="max-w-2xl mx-auto px-4 pt-24 pb-10">
        {/* Шапка */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Уведомления</h1>
            {unreadCount > 0 && (
              <p className="text-xs text-gray-500 mt-0.5">{unreadCount} непрочитанных</p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              disabled={markingAll}
              className="text-xs font-medium text-[#00CC00] hover:text-[#00b300] transition-colors disabled:opacity-50"
            >
              {markingAll ? 'Обновление…' : 'Отметить все как прочитанные'}
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-16 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">Уведомлений пока нет</p>
            <p className="text-xs text-gray-400">Здесь будут появляться ответы на ваши комментарии и рекомендованные проекты</p>
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(groups).map(([label, items]) => (
              <div key={label}>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">{label}</p>
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
                  {items.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors group ${!n.isRead ? 'bg-blue-50/40' : ''}`}
                    >
                      {/* Иконка типа */}
                      <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center mt-0.5 ${typeBg[n.type] || 'bg-gray-100'}`}>
                        {typeIcon[n.type]}
                      </div>

                      {/* Текст */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold text-gray-900 ${!n.isRead ? 'text-gray-900' : 'text-gray-600'}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {new Date(n.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      {/* Правая часть: точка непрочитанного + удаление */}
                      <div className="flex-shrink-0 flex flex-col items-end gap-2 pt-0.5">
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-[#00CC00]" />
                        )}
                        <Tooltip text="Удалить">
                          <button
                            onClick={(e) => handleDelete(e, n.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-400 rounded transition-all"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
