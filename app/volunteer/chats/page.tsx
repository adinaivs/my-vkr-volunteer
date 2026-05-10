'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import VolunteerNav from '../components/VolunteerNav';
import VolunteerSidebar from '../components/VolunteerSidebar';
import AiSupportButton from '@/app/components/AiSupportButton';
import { SidebarProvider } from '@/app/contexts/SidebarContext';

interface ChatUser {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: string;
}

interface Chat {
  id: string;
  name: string;
  createdAt: string;
  project: { id: string; title: string; status: string; imageUrl?: string };
  membersCount: number;
  members: ChatUser[];
  lastMessage: { content: string; createdAt: string; sender: { id: string; firstName: string; lastName: string } } | null;
}

export default function VolunteerChatsPage() {
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
        if (me.role !== 'volunteer') { router.push('/dashboard'); return; }
        setUser(me);
        const chatsRes = await fetch('/api/chats');
        if (chatsRes.ok) setChats((await chatsRes.json()).chats);
      } finally { setLoading(false); }
    };
    init();
  }, [router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00]" />
    </div>
  );

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50">
        <VolunteerSidebar user={user} />
        <VolunteerNav user={user} />

        <div className="lg:ml-[272px] pt-20 pb-0 px-3 h-screen flex flex-col">
          <div className="flex gap-3 flex-1 overflow-hidden pb-3">

            {/* ЛЕВАЯ ПАНЕЛЬ — пустое состояние (выберите чат) */}
            <div className="flex-1 bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-1">Выберите чат</h3>
              <p className="text-sm text-gray-400">Нажмите на чат справа, чтобы открыть переписку</p>
            </div>

            {/* ПРАВАЯ ПАНЕЛЬ — список чатов */}
            <div className="w-80 shrink-0 bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden">
              <div className="px-4 py-4 border-b border-gray-100">
                <h1 className="text-lg font-bold text-gray-900">Чаты</h1>
                <p className="text-xs text-gray-400 mt-0.5">Групповые чаты проектов</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {chats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500">Нет активных чатов</p>
                    <p className="text-xs text-gray-400 mt-1">Вступите в проект — чат появится, когда набор завершится</p>
                  </div>
                ) : (
                  chats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => router.push(`/volunteer/chats/${chat.id}`)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#00CC00] to-emerald-500 rounded-xl flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-gray-900 text-sm truncate">{chat.name}</span>
                            {chat.lastMessage && (
                              <span className="text-xs text-gray-400 shrink-0">
                                {new Date(chat.lastMessage.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mb-0.5">{chat.membersCount} участников</p>
                          {chat.lastMessage ? (
                            <p className="text-xs text-gray-500 truncate">
                              <span className="font-medium">{chat.lastMessage.sender.firstName}:</span>{' '}{chat.lastMessage.content}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-400 italic">Нет сообщений</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>

        <AiSupportButton />
      </div>
    </SidebarProvider>
  );
}
