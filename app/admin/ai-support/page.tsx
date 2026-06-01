'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AdminNav from '../components/AdminNav';
import AdminSidebar from '../components/AdminSidebar';
import DynamicContent from '@/app/components/DynamicContent';
import { SidebarProvider } from '@/app/contexts/SidebarContext';

interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

interface ChatUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
  role: string;
}

interface AiMessage {
  id: string;
  sender: 'user' | 'ai';
  message: string;
  createdAt: string;
}

interface AiChat {
  id: string;
  name: string;
  createdAt: string;
  user: ChatUser | null;
  messages: AiMessage[];
  _count: { messages: number };
}

interface Stats {
  totalChats: number;
  totalMessages: number;
  uniqueUsers: number;
  aiResolutionRate: number;
}

function fmtDate(d: string) {
  const date = new Date(d);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60000) return 'только что';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
  if (diff < 86400000) return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function fmtFull(d: string) {
  return new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminAiSupportPage() {
  const router = useRouter();
  const [me, setMe] = useState<AdminUser | null>(null);
  const [chats, setChats] = useState<AiChat[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedChat, setSelectedChat] = useState<AiChat | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (!d.user || d.user.role !== 'admin') { router.push('/admin/login'); return; }
      setMe(d.user);
    });
  }, [router]);

  useEffect(() => {
    fetchChats();
  }, [search]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  async function fetchChats() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    const res = await fetch(`/api/admin/ai-support?${params}`);
    const data = await res.json();
    setChats(data.chats || []);
    setStats(data.stats || null);
    setLoading(false);
  }

  async function openChat(chat: AiChat) {
    setSelectedChat(chat);
    setLoadingMessages(true);
    const res = await fetch(`/api/admin/ai-support/${chat.id}/messages`);
    const data = await res.json();
    setMessages(data.chat?.messages || []);
    setLoadingMessages(false);
  }

  if (!me) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50">
        <AdminNav user={me} />
        <AdminSidebar user={me} />
        <DynamicContent>
          <div className="p-4 sm:p-6">
            {/* Заголовок */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Чат поддержки ИИ</h1>
              <p className="text-gray-500 text-sm mt-1">История обращений пользователей к ИИ-ассистенту</p>
            </div>

            {/* Статистика */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Всего диалогов', value: stats.totalChats, icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', color: 'bg-blue-50 text-blue-600' },
                  { label: 'Сообщений', value: stats.totalMessages, icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z', color: 'bg-green-50 text-green-600' },
                  { label: 'Уникальных пользователей', value: stats.uniqueUsers, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', color: 'bg-purple-50 text-purple-600' },
                  { label: 'Ответов ИИ', value: `${stats.aiResolutionRate}%`, icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', color: 'bg-yellow-50 text-yellow-600' },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${s.color}`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} />
                      </svg>
                    </div>
                    <div className="text-xl font-bold text-gray-900">{s.value}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Основная панель */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" style={{ height: '60vh', minHeight: 420 }}>
              <div className="flex h-full">
                {/* Левая панель — список чатов */}
                <div className="w-80 flex-shrink-0 border-r border-gray-200 flex flex-col">
                  <div className="p-3 border-b border-gray-100">
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Поиск по пользователю..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00CC00]/30"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {loading ? (
                      <div className="flex items-center justify-center h-32">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#00CC00]" />
                      </div>
                    ) : chats.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                        <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="text-sm">Диалоги не найдены</p>
                      </div>
                    ) : (
                      chats.map((chat) => {
                        const lastMsg = chat.messages[0];
                        const isSelected = selectedChat?.id === chat.id;
                        return (
                          <button
                            key={chat.id}
                            onClick={() => openChat(chat)}
                            className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-green-50 border-l-2 border-l-[#00CC00]' : ''}`}
                          >
                            <div className="flex items-center gap-3">
                              {chat.user?.avatarUrl ? (
                                <img src={chat.user.avatarUrl} className="w-9 h-9 rounded-full object-cover flex-shrink-0" alt="" />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-[#00CC00] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                  {chat.user ? `${chat.user.firstName[0]}${chat.user.lastName[0]}` : '?'}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-sm font-medium text-gray-900 truncate">
                                    {chat.user ? `${chat.user.firstName} ${chat.user.lastName}` : 'Аноним'}
                                  </span>
                                  {lastMsg && (
                                    <span className="text-[10px] text-gray-400 flex-shrink-0">{fmtDate(lastMsg.createdAt)}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="text-xs text-gray-400 truncate flex-1">
                                    {lastMsg ? (lastMsg.sender === 'ai' ? '🤖 ' : '👤 ') + lastMsg.message.slice(0, 45) + (lastMsg.message.length > 45 ? '…' : '') : 'Нет сообщений'}
                                  </span>
                                  <span className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-1.5 flex-shrink-0">{chat._count.messages}</span>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Правая панель — сообщения */}
                <div className="flex-1 flex flex-col">
                  {!selectedChat ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                      <svg className="w-14 h-14 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p className="text-sm font-medium">Выберите диалог</p>
                      <p className="text-xs mt-1">Нажмите на чат слева для просмотра переписки</p>
                    </div>
                  ) : (
                    <>
                      {/* Шапка чата */}
                      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                        {selectedChat.user?.avatarUrl ? (
                          <img src={selectedChat.user.avatarUrl} className="w-9 h-9 rounded-full object-cover" alt="" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[#00CC00] flex items-center justify-center text-white text-sm font-bold">
                            {selectedChat.user ? `${selectedChat.user.firstName[0]}${selectedChat.user.lastName[0]}` : '?'}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {selectedChat.user ? `${selectedChat.user.firstName} ${selectedChat.user.lastName}` : 'Аноним'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {selectedChat.user?.email} · {selectedChat.user?.role === 'volunteer' ? 'Волонтёр' : selectedChat.user?.role === 'organizer' ? 'Организатор' : 'Пользователь'}
                          </div>
                        </div>
                        <div className="ml-auto text-xs text-gray-400">
                          {messages.length} сообщений
                        </div>
                      </div>

                      {/* Сообщения */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {loadingMessages ? (
                          <div className="flex justify-center pt-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#00CC00]" />
                          </div>
                        ) : messages.length === 0 ? (
                          <div className="text-center text-gray-400 text-sm pt-8">Нет сообщений</div>
                        ) : (
                          messages.map((msg) => (
                            <div key={msg.id} className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                              {msg.sender === 'ai' && (
                                <div className="w-7 h-7 rounded-full bg-[#00CC00] flex items-center justify-center flex-shrink-0 mt-1">
                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                  </svg>
                                </div>
                              )}
                              <div className={`max-w-[70%] ${msg.sender === 'user' ? 'bg-[#00CC00] text-white' : 'bg-gray-100 text-gray-800'} rounded-2xl px-3 py-2`}>
                                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                <p className={`text-[10px] mt-1 ${msg.sender === 'user' ? 'text-green-100' : 'text-gray-400'}`}>{fmtFull(msg.createdAt)}</p>
                              </div>
                              {msg.sender === 'user' && selectedChat.user?.avatarUrl ? (
                                <img src={selectedChat.user.avatarUrl} className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-1" alt="" />
                              ) : msg.sender === 'user' ? (
                                <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0 mt-1 text-xs font-bold text-gray-600">
                                  {selectedChat.user ? selectedChat.user.firstName[0] : '?'}
                                </div>
                              ) : null}
                            </div>
                          ))
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DynamicContent>
      </div>
    </SidebarProvider>
  );
}
