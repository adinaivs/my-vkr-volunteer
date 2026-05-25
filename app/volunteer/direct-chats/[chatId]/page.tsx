'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import VolunteerNav from '../../components/VolunteerNav';
import VolunteerSidebar from '../../components/VolunteerSidebar';
import AiSupportButton from '@/app/components/AiSupportButton';
import { SidebarProvider } from '@/app/contexts/SidebarContext';
import { useTranslation } from '@/app/i18n/useTranslation';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: string;
}

interface DirectChat {
  id: string;
  otherUser: User;
  lastMessage: { content: string; createdAt: string; sender: { id: string; firstName: string; lastName: string } } | null;
  createdAt: string;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: User;
}

export default function VolunteerDirectChatRoomPage() {
  const router = useRouter();
  const { chatId } = useParams<{ chatId: string }>();
  const { t } = useTranslation('volunteer');

  const [me, setMe] = useState<User | null>(null);
  const [chats, setChats] = useState<DirectChat[]>([]);
  const [currentChat, setCurrentChat] = useState<DirectChat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMessages = useCallback(async () => {
    const res = await fetch(`/api/direct-chats/${chatId}/messages`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages);
    }
  }, [chatId]);

  useEffect(() => {
    const init = async () => {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) { router.push('/login'); return; }
        const { user: meData } = await meRes.json();
        if (meData.role !== 'volunteer') { router.push('/dashboard'); return; }
        setMe(meData);

        const chatsRes = await fetch('/api/direct-chats');
        if (chatsRes.ok) {
          const data = await chatsRes.json();
          setChats(data.chats);
          const chat = data.chats.find((c: DirectChat) => c.id === chatId);
          if (chat) {
            setCurrentChat(chat);
          } else {
            router.push('/volunteer/direct-chats');
            return;
          }
        }

        await fetchMessages();
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [chatId, router, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (loading) return;
    pollRef.current = setInterval(fetchMessages, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loading, fetchMessages]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const content = text.trim();
    setText('');
    try {
      const res = await fetch(`/api/direct-chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        await fetchMessages();
      } else {
        setText(content);
      }
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Сегодня';
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Вчера';
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

  const formatShortDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

  const grouped: { date: string; msgs: Message[] }[] = [];
  for (const msg of messages) {
    const d = formatDate(msg.createdAt);
    if (!grouped.length || grouped[grouped.length - 1].date !== d) {
      grouped.push({ date: d, msgs: [msg] });
    } else {
      grouped[grouped.length - 1].msgs.push(msg);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00]" />
      </div>
    );
  }

  if (!me) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50">
        <VolunteerSidebar user={me} />
        <VolunteerNav user={me} />

        <div className="lg:ml-[272px] pt-20 pb-0 px-3 h-screen flex flex-col">
          <div className="flex gap-3 flex-1 overflow-hidden pb-3">

            {/* ЛЕВАЯ ПАНЕЛЬ — сам чат */}
            <div className="flex-1 bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 bg-white shrink-0">
                {currentChat?.otherUser.avatarUrl ? (
                  <img 
                    src={currentChat.otherUser.avatarUrl} 
                    alt="" 
                    className="w-9 h-9 rounded-full object-cover shrink-0" 
                  />
                ) : (
                  <div className="w-9 h-9 bg-gradient-to-br from-[#00CC00] to-emerald-500 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-sm">
                    {currentChat?.otherUser.firstName[0]}{currentChat?.otherUser.lastName[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-gray-900 truncate text-sm">
                    {currentChat?.otherUser.firstName} {currentChat?.otherUser.lastName}
                  </h2>
                  <p className="text-xs text-gray-500">{t.chats?.organizatorLabel || 'Организатор'}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
                {grouped.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                      <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-600">{t.chats?.noMessages || 'Нет сообщений'}</p>
                    <p className="text-xs text-gray-400 mt-1">{t.chats?.beFirst || 'Будьте первым — напишите что-нибудь!'}</p>
                  </div>
                )}
                {grouped.map((group) => (
                  <div key={group.date}>
                    <div className="flex items-center gap-3 my-3">
                      <div className="flex-1 h-px bg-gray-100" />
                      <span className="text-xs text-gray-400 px-2">{group.date}</span>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>
                    {group.msgs.map((msg, i) => {
                      const isMe = msg.sender.id === me.id;
                      const showAvatar = !isMe && (i === 0 || group.msgs[i - 1]?.sender.id !== msg.sender.id);
                      return (
                        <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                          {!isMe && (
                            <div className="w-7 h-7 shrink-0">
                              {showAvatar && (
                                msg.sender.avatarUrl ? (
                                  <img src={msg.sender.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-[#00CC00] flex items-center justify-center text-white text-xs font-bold">
                                    {msg.sender.firstName[0]}
                                  </div>
                                )
                              )}
                            </div>
                          )}
                          <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                            {showAvatar && !isMe && (
                              <span className="text-xs text-gray-500 ml-1 mb-0.5">
                                {msg.sender.firstName} {msg.sender.lastName}
                              </span>
                            )}
                            <div className={`px-3 py-2 rounded-2xl text-sm ${
                              isMe
                                ? 'bg-[#00CC00] text-white rounded-br-sm'
                                : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                            }`}>
                              {msg.content}
                            </div>
                            <span className="text-xs text-gray-400 mt-0.5 px-1">{formatTime(msg.createdAt)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-gray-100 bg-white shrink-0">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`${t.chats?.typeMessage || 'Введите сообщение...'} (${t.chats?.typeHint || 'Enter — отправить'})`}
                    rows={1}
                    className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent resize-none max-h-32"
                    style={{ overflowY: 'auto' }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!text.trim() || sending}
                    className="w-10 h-10 bg-[#00CC00] text-white rounded-xl flex items-center justify-center hover:bg-[#00b300] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* ПРАВАЯ ПАНЕЛЬ — список чатов */}
            <div className="w-80 shrink-0 bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden">
              <div className="px-4 py-4 border-b border-gray-100">
                <h1 className="text-lg font-bold text-gray-900">{t.chats?.directMessages || 'Личные сообщения'}</h1>
                <p className="text-xs text-gray-400 mt-0.5">{t.chats?.directSubtitle || 'Переписка с организаторами'}</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {chats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500">{t.chats?.noDirectChats || 'Нет активных чатов'}</p>
                    <p className="text-xs text-gray-400 mt-1">{t.chats?.noDirectChatsHint || 'Организаторы могут написать вам напрямую'}</p>
                  </div>
                ) : (
                  chats.map((chat) => {
                    const isActive = chat.id === chatId;
                    return (
                      <button
                        key={chat.id}
                        onClick={() => router.push(`/volunteer/direct-chats/${chat.id}`)}
                        className={`w-full text-left px-4 py-3 transition-colors border-b border-gray-50 last:border-0 ${
                          isActive ? 'bg-green-50 border-l-2 border-l-[#00CC00]' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {chat.otherUser.avatarUrl ? (
                            <img 
                              src={chat.otherUser.avatarUrl} 
                              alt="" 
                              className="w-10 h-10 rounded-full object-cover shrink-0" 
                            />
                          ) : (
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-sm ${
                              isActive ? 'bg-[#00CC00]' : 'bg-gradient-to-br from-[#00CC00] to-emerald-500'
                            }`}>
                              {chat.otherUser.firstName[0]}{chat.otherUser.lastName[0]}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className={`font-semibold text-sm truncate ${isActive ? 'text-[#00CC00]' : 'text-gray-900'}`}>
                                {chat.otherUser.firstName} {chat.otherUser.lastName}
                              </span>
                              {chat.lastMessage && (
                                <span className="text-xs text-gray-400 shrink-0">
                                  {formatShortDate(chat.lastMessage.createdAt)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mb-0.5">{t.chats?.organizatorLabel || 'Организатор'}</p>
                            {chat.lastMessage ? (
                              <p className="text-xs text-gray-500 truncate">
                                <span className="font-medium">{chat.lastMessage.sender.firstName}:</span>{' '}{chat.lastMessage.content}
                              </p>
                            ) : (
                              <p className="text-xs text-gray-400 italic">{t.chats?.noMessages || 'Нет сообщений'}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
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
