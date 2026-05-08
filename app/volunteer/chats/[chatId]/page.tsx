'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import VolunteerNav from '../../components/VolunteerNav';
import VolunteerSidebar from '../../components/VolunteerSidebar';
import DynamicContent from '@/app/components/DynamicContent';
import { SidebarProvider } from '@/app/contexts/SidebarContext';

interface ChatUser {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: string;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: ChatUser;
}

export default function VolunteerChatRoomPage() {
  const router = useRouter();
  const { chatId } = useParams<{ chatId: string }>();

  const [me, setMe] = useState<ChatUser | null>(null);
  const [chatName, setChatName] = useState('');
  const [members, setMembers] = useState<ChatUser[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMessages = useCallback(async () => {
    const res = await fetch(`/api/chats/${chatId}/messages`);
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

        // Получаем чат из списка
        const chatsRes = await fetch('/api/chats');
        if (chatsRes.ok) {
          const data = await chatsRes.json();
          const chat = data.chats.find((c: { id: string }) => c.id === chatId);
          if (chat) {
            setChatName(chat.name);
            setMembers(chat.members);
          } else {
            router.push('/volunteer/chats');
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

  // Scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Polling every 4 seconds
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
      const res = await fetch(`/api/chats/${chatId}/messages`, {
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

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Сегодня';
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Вчера';
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

  // Group messages by date
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
      <div className="min-h-screen bg-green-50 flex flex-col">
        <VolunteerSidebar user={me} />
        <VolunteerNav user={me} />

        <DynamicContent maxWidth="max-w-3xl">
          <div className="flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" style={{ height: 'calc(100vh - 130px)' }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-white">
              <Link href="/volunteer/chats" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="w-9 h-9 bg-gradient-to-br from-[#00CC00] to-emerald-500 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-gray-900 truncate text-sm">{chatName}</h2>
                <p className="text-xs text-gray-500">{members.length} участников</p>
              </div>
              <button
                onClick={() => setShowMembers(!showMembers)}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500"
                title="Участники"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
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
                                {msg.sender.role === 'organizer' && <span className="ml-1 text-[#00CC00]">• Организатор</span>}
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

              {/* Members panel */}
              {showMembers && (
                <div className="w-56 border-l border-gray-100 bg-gray-50 overflow-y-auto p-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Участники</p>
                  <div className="space-y-2">
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center gap-2">
                        {m.avatarUrl ? (
                          <img src={m.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-[#00CC00] flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {m.firstName[0]}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate">{m.firstName} {m.lastName}</p>
                          <p className="text-xs text-gray-400">{m.role === 'organizer' ? 'Организатор' : 'Волонтёр'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-gray-100 bg-white">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Введите сообщение... (Enter — отправить)"
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
        </DynamicContent>
      </div>
    </SidebarProvider>
  );
}
