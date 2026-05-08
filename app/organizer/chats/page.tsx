'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import OrganizerNav from '../components/OrganizerNav';
import OrganizerSidebar from '../components/OrganizerSidebar';
import AiSupportButton from '@/app/components/AiSupportButton';
import DynamicContent from '@/app/components/DynamicContent';
import { SidebarProvider } from '@/app/contexts/SidebarContext';

interface ChatUser {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: string;
}

interface LastMessage {
  content: string;
  createdAt: string;
  sender: { id: string; firstName: string; lastName: string };
}

interface Chat {
  id: string;
  name: string;
  createdAt: string;
  project: { id: string; title: string; status: string };
  membersCount: number;
  members: ChatUser[];
  lastMessage: LastMessage | null;
}

export default function OrganizerChatsPage() {
  const router = useRouter();
  const [user, setUser] = useState<ChatUser | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) { router.push('/login'); return; }
        const { user: me } = await meRes.json();
        if (me.role !== 'organizer') { router.push('/dashboard'); return; }
        setUser(me);

        const chatsRes = await fetch('/api/chats');
        if (chatsRes.ok) {
          const data = await chatsRes.json();
          setChats(data.chats);
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00]" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50">
        <OrganizerSidebar user={user} />
        <OrganizerNav user={user} />
        <DynamicContent maxWidth="max-w-3xl">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Групповые чаты</h1>
            <p className="text-gray-500 mt-1 text-sm">Создаются автоматически при переводе проекта в «Скоро начнётся»</p>
          </div>

          {chats.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Нет активных чатов</h3>
              <p className="text-gray-500 text-sm">Переведите проект в статус «Скоро начнётся» — чат создастся автоматически</p>
            </div>
          ) : (
            <div className="space-y-3">
              {chats.map((chat) => (
                <Link
                  key={chat.id}
                  href={`/organizer/chats/${chat.id}`}
                  className="block bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:border-[#00CC00] hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#00CC00] to-emerald-500 rounded-xl flex items-center justify-center shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">{chat.name}</h3>
                        {chat.lastMessage && (
                          <span className="text-xs text-gray-400 shrink-0">
                            {new Date(chat.lastMessage.createdAt).toLocaleDateString('ru-RU')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mb-1">{chat.membersCount} участников</p>
                      {chat.lastMessage ? (
                        <p className="text-sm text-gray-600 truncate">
                          <span className="font-medium">{chat.lastMessage.sender.firstName}:</span>{' '}
                          {chat.lastMessage.content}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400 italic">Нет сообщений</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </DynamicContent>
        <AiSupportButton />
      </div>
    </SidebarProvider>
  );
}
