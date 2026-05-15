'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import OrganizerNav from '../../components/OrganizerNav';
import OrganizerSidebar from '../../components/OrganizerSidebar';
import AiSupportButton from '@/app/components/AiSupportButton';
import { SidebarProvider } from '@/app/contexts/SidebarContext';
import MessageStatus from '@/app/components/MessageStatus';
import { useTranslation } from '@/app/i18n/useTranslation';

interface ChatUser {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: string;
}

interface GroupChat {
  id: string;
  name: string;
  createdAt: string;
  project: { id: string; title: string; status: string; imageUrl?: string };
  membersCount: number;
  members: ChatUser[];
  lastMessage: { content: string; createdAt: string; sender: { id: string; firstName: string; lastName: string } } | null;
}

interface DirectChat {
  id: string;
  otherUser: ChatUser;
  lastMessage: { content: string; createdAt: string; sender: { id: string; firstName: string; lastName: string } } | null;
  createdAt: string;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  deliveredTo?: string[];
  readBy?: string[];
  sender: ChatUser;
}

export default function OrganizerChatRoomPage() {
  const router = useRouter();
  const { chatId } = useParams<{ chatId: string }>();
  const { t } = useTranslation('organizer');

  const [me, setMe] = useState<ChatUser | null>(null);
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  const [directChats, setDirectChats] = useState<DirectChat[]>([]);
  const [currentGroupChat, setCurrentGroupChat] = useState<GroupChat | null>(null);
  const [currentDirectChat, setCurrentDirectChat] = useState<DirectChat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Определяем тип чата по chatId
  const isDirectChat = chatId.startsWith('direct-');
  const actualChatId = isDirectChat ? chatId.replace('direct-', '') : chatId;

  const fetchMessages = useCallback(async () => {
    try {
      const endpoint = isDirectChat 
        ? `/api/direct-chats/${actualChatId}/messages`
        : `/api/chats/${actualChatId}/messages`;
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('[fetchMessages] Ошибка:', error);
    }
  }, [actualChatId, isDirectChat]);

  useEffect(() => {
    const init = async () => {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) { router.push('/login'); return; }
        const { user: meData } = await meRes.json();
        if (meData.role !== 'organizer') { router.push('/dashboard'); return; }
        setMe(meData);

        // Загружаем групповые чаты
        const groupChatsRes = await fetch('/api/chats');
        if (groupChatsRes.ok) {
          const data = await groupChatsRes.json();
          setGroupChats(data.chats);
          
          if (!isDirectChat) {
            const chat = data.chats.find((c: GroupChat) => c.id === actualChatId);
            if (chat) {
              setCurrentGroupChat(chat);
            } else {
              router.push('/organizer/chats');
              return;
            }
          }
        }

        // Загружаем личные чаты
        const directChatsRes = await fetch('/api/direct-chats');
        if (directChatsRes.ok) {
          const data = await directChatsRes.json();
          setDirectChats(data.chats);
          
          if (isDirectChat) {
            const chat = data.chats.find((c: DirectChat) => c.id === actualChatId);
            if (chat) {
              setCurrentDirectChat(chat);
            } else {
              router.push('/organizer/chats');
              return;
            }
          }
        }

        await fetchMessages();
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [chatId, actualChatId, isDirectChat, router, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (loading) return;
    pollRef.current = setInterval(fetchMessages, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loading, fetchMessages]);

  // Отдельный интервал для обновления списков чатов (для индикаторов непрочитанных)
  useEffect(() => {
    if (loading) return;
    
    const updateChatLists = async () => {
      const groupChatsRes = await fetch('/api/chats');
      if (groupChatsRes.ok) {
        const groupData = await groupChatsRes.json();
        setGroupChats(groupData.chats);
      }
      
      const directChatsRes = await fetch('/api/direct-chats');
      if (directChatsRes.ok) {
        const directData = await directChatsRes.json();
        setDirectChats(directData.chats);
      }
    };

    const interval = setInterval(updateChatLists, 3000);
    return () => clearInterval(interval);
  }, [loading]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const content = text.trim();
    setText('');
    try {
      const endpoint = isDirectChat
        ? `/api/direct-chats/${actualChatId}/messages`
        : `/api/chats/${actualChatId}/messages`;
      const res = await fetch(endpoint, {
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

  const handleMessageMember = async (memberId: string) => {
    if (memberId === me?.id) return; // Не можем написать самому себе
    
    try {
      // Создаем или получаем существующий личный чат
      const res = await fetch('/api/direct-chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otherUserId: memberId }),
      });
      
      if (res.ok) {
        const data = await res.json();
        // Переходим в личный чат
        router.push(`/organizer/chats/direct-${data.chatId}`);
      } else {
        const errorData = await res.json();
        alert(`Ошибка: ${errorData.error || 'Не удалось создать чат'}`);
      }
    } catch (error) {
      console.error('Ошибка при создании чата:', error);
      alert('Ошибка при создании чата');
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

  const members = currentGroupChat?.members ?? [];
  const chatName = isDirectChat 
    ? `${currentDirectChat?.otherUser.firstName} ${currentDirectChat?.otherUser.lastName}`
    : currentGroupChat?.name;
  const chatSubtitle = isDirectChat
    ? (t.chats?.volunteerLabel || 'Волонтёр')
    : `${members.length} ${t.chats?.participants || 'участников'}`;

  // Объединяем все чаты для списка справа
  const allChats = [
    ...directChats.map(chat => ({
      id: `direct-${chat.id}`,
      type: 'direct' as const,
      name: `${chat.otherUser.firstName} ${chat.otherUser.lastName}`,
      avatar: chat.otherUser.avatarUrl,
      initials: `${chat.otherUser.firstName[0]}${chat.otherUser.lastName[0]}`,
      subtitle: t.chats?.volunteerLabel || 'Волонтёр',
      lastMessage: chat.lastMessage,
      lastMessageTime: chat.lastMessage?.createdAt || chat.createdAt,
      unreadCount: chat.unreadCount || 0,
    })),
    ...groupChats.map(chat => ({
      id: chat.id,
      type: 'group' as const,
      name: chat.name,
      avatar: null,
      initials: null,
      subtitle: `${chat.membersCount} ${t.chats?.participants || 'участников'}`,
      lastMessage: chat.lastMessage,
      lastMessageTime: chat.lastMessage?.createdAt || chat.createdAt,
      unreadCount: chat.unreadCount || 0,
    })),
  ].sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50">
        <OrganizerSidebar user={me} />
        <OrganizerNav user={me} />

        <div className="lg:ml-[272px] pt-20 pb-0 px-3 h-screen flex flex-col">
          <div className="flex gap-3 flex-1 overflow-hidden pb-3">

            {/* ЛЕВАЯ ПАНЕЛЬ — сам чат */}
            <div className="flex-1 bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 bg-white shrink-0">
                {isDirectChat ? (
                  currentDirectChat?.otherUser.avatarUrl ? (
                    <img 
                      src={currentDirectChat.otherUser.avatarUrl} 
                      alt="" 
                      className="w-9 h-9 rounded-full object-cover shrink-0" 
                    />
                  ) : (
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-sm">
                      {currentDirectChat?.otherUser.firstName[0]}{currentDirectChat?.otherUser.lastName[0]}
                    </div>
                  )
                ) : (
                  <div className="w-9 h-9 bg-gradient-to-br from-[#00CC00] to-emerald-500 rounded-xl flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-gray-900 truncate text-sm">{chatName}</h2>
                  <p className="text-xs text-gray-500">{chatSubtitle}</p>
                </div>
                {!isDirectChat && (
                  <button
                    onClick={() => setShowMembers(!showMembers)}
                    className={`p-2 rounded-xl transition-colors ${showMembers ? 'bg-green-50 text-[#00CC00]' : 'hover:bg-gray-100 text-gray-500'}`}
                    title="Участники"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="flex flex-1 overflow-hidden">
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
                      <p className="text-xs text-gray-400 mt-1">{t.chats?.beFirst || 'Напишите первое сообщение!'}</p>
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
                            <div className={`max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              {showAvatar && !isMe && (
                                <span className="text-xs text-gray-500 ml-1 mb-0.5">
                                  {msg.sender.firstName} {msg.sender.lastName}
                                  {msg.sender.role === 'volunteer' && <span className="ml-1 text-gray-400">• {t.chats?.volunteerRole || 'Волонтёр'}</span>}
                                </span>
                              )}
                              <div className={`px-3 py-2 rounded-2xl text-sm ${
                                isMe
                                  ? 'bg-[#00CC00] text-white rounded-br-sm'
                                  : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                              }`}>
                                {msg.content}
                              </div>
                              <div className="flex items-center gap-1 mt-0.5 px-1">
                                <span className="text-xs text-gray-400">{formatTime(msg.createdAt)}</span>
                                {isMe && (
                                  <MessageStatus
                                    message={msg}
                                    currentUserId={me.id}
                                    otherUserId={isDirectChat ? currentDirectChat?.otherUser.id : undefined}
                                    chatMembers={!isDirectChat ? members : undefined}
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                {/* Members panel */}
                {showMembers && !isDirectChat && (
                  <div className="w-64 border-l border-gray-100 bg-gray-50 overflow-y-auto p-3 shrink-0">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t.chats?.membersPanel || 'Участники'} ({members.length})</p>
                    <div className="space-y-2">
                      {members.map((m) => (
                        <div key={m.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white transition-colors">
                          {m.avatarUrl ? (
                            <img src={m.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#00CC00] flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {m.firstName[0]}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 truncate">{m.firstName} {m.lastName}</p>
                            <p className="text-xs text-gray-400">{m.role === 'organizer' ? (t.chats?.organizerRole || 'Организатор') : (t.chats?.volunteerRole || 'Волонтёр')}</p>
                          </div>
                          {m.id !== me?.id && (
                            <button
                              onClick={() => handleMessageMember(m.id)}
                              className="p-1.5 rounded-lg bg-[#00CC00] hover:bg-[#00b300] text-white transition-colors shrink-0"
                              title="Написать"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-gray-100 bg-white shrink-0">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-end gap-2"
                >
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
                    type="button"
                    onClick={handleSend}
                    disabled={!text.trim() || sending}
                    className="w-10 h-10 bg-[#00CC00] text-white rounded-xl flex items-center justify-center hover:bg-[#00b300] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </form>
              </div>
            </div>

            {/* ПРАВАЯ ПАНЕЛЬ — список чатов */}
            <div className="w-80 shrink-0 bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden">
              <div className="px-4 py-4 border-b border-gray-100">
                <h1 className="text-lg font-bold text-gray-900">{t.chats?.title || 'Сообщения'}</h1>
                <p className="text-xs text-gray-400 mt-0.5">{t.chats?.totalChats || 'Всего чатов'}: {allChats.length}</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {allChats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500">{t.chats?.noChats || 'Нет активных чатов'}</p>
                    <p className="text-xs text-gray-400 mt-1">{t.chats?.noChatsHintCreate || 'Создайте проект или напишите волонтеру'}</p>
                  </div>
                ) : (
                  allChats.map((chat) => {
                    const isActive = chat.id === chatId;
                    return (
                      <button
                        key={chat.id}
                        onClick={() => router.push(`/organizer/chats/${chat.id}`)}
                        className={`w-full text-left px-4 py-3 transition-colors border-b border-gray-50 last:border-0 ${
                          isActive ? 'bg-green-50 border-l-2 border-l-[#00CC00]' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Аватар/Иконка */}
                          <div className="relative">
                            {chat.type === 'direct' ? (
                              chat.avatar ? (
                                <img 
                                  src={chat.avatar} 
                                  alt="" 
                                  className="w-10 h-10 rounded-full object-cover shrink-0" 
                                />
                              ) : (
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-sm ${
                                  isActive ? 'bg-blue-600' : 'bg-gradient-to-br from-blue-500 to-blue-600'
                                }`}>
                                  {chat.initials}
                                </div>
                              )
                            ) : (
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                isActive ? 'bg-[#00CC00]' : 'bg-gradient-to-br from-[#00CC00] to-emerald-500'
                              }`}>
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </div>
                            )}
                            {chat.unreadCount > 0 && (
                              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-[#00CC00] text-white rounded-full border-2 border-white">
                                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                              </span>
                            )}
                          </div>
                          
                          {/* Информация о чате */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className={`text-sm truncate ${chat.unreadCount > 0 ? 'font-bold text-gray-900' : isActive ? 'font-semibold text-[#00CC00]' : 'font-semibold text-gray-900'}`}>
                                {chat.name}
                              </span>
                              {chat.lastMessage && (
                                <span className="text-xs text-gray-400 shrink-0">
                                  {formatShortDate(chat.lastMessage.createdAt)}
                                </span>
                              )}
                            </div>
                            <p className={`text-xs mb-0.5 ${chat.type === 'direct' ? 'text-blue-600' : 'text-green-600'}`}>
                              {chat.subtitle}
                            </p>
                            {chat.lastMessage ? (
                              <p className={`text-xs truncate ${chat.unreadCount > 0 ? 'font-semibold text-gray-700' : 'text-gray-500'}`}>
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
