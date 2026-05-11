'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ProjectRow {
  num: number;
  id: string;
  title: string;
  category: string;
  location: string;
  dates: string;
  volunteers: string;
  status: string;
}

interface ProjectDetail {
  title: string;
  category: string;
  location: string;
  dates: string;
  volunteers: string;
  status: string;
  description: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  projectsData?: ProjectRow[] | null;
  projectDetail?: ProjectDetail | null;
}

// ── Таблица проектов ────────────────────────────────────────────
function ProjectsTable({ projects }: { projects: ProjectRow[] }) {
  return (
    <div className="mt-2 overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-[#00CC00] text-white">
            <th className="px-2 py-2 text-left font-semibold">№</th>
            <th className="px-2 py-2 text-left font-semibold">Название</th>
            <th className="px-2 py-2 text-left font-semibold">Категория</th>
            <th className="px-2 py-2 text-left font-semibold">Даты</th>
            <th className="px-2 py-2 text-left font-semibold">Волонтёры</th>
            <th className="px-2 py-2 text-left font-semibold">Статус</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p, i) => (
            <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-green-50'}>
              <td className="px-2 py-2 text-gray-500">{p.num}</td>
              <td className="px-2 py-2 font-medium text-gray-800 max-w-[120px] truncate">{p.title}</td>
              <td className="px-2 py-2 text-gray-600">{p.category}</td>
              <td className="px-2 py-2 text-gray-600 whitespace-nowrap">{p.dates}</td>
              <td className="px-2 py-2 text-center text-gray-600">{p.volunteers}</td>
              <td className="px-2 py-2">
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${
                  p.status === 'Набор волонтёров'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {p.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Карточка конкретного проекта ────────────────────────────────
function ProjectCard({ project }: { project: ProjectDetail }) {
  return (
    <div className="mt-2 border border-green-200 rounded-xl overflow-hidden">
      <div className="bg-[#00CC00] px-3 py-2">
        <span className="text-white font-semibold text-sm">{project.title}</span>
      </div>
      <div className="bg-white p-3 space-y-1.5 text-xs text-gray-700">
        <div className="flex gap-2">
          <span className="text-gray-400 w-20 shrink-0">Категория:</span>
          <span>{project.category}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-gray-400 w-20 shrink-0">Место:</span>
          <span>{project.location}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-gray-400 w-20 shrink-0">Даты:</span>
          <span>{project.dates}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-gray-400 w-20 shrink-0">Волонтёры:</span>
          <span>{project.volunteers}</span>
        </div>
        <div className="flex gap-2 pt-1">
          <span className="text-gray-400 w-20 shrink-0">Описание:</span>
          <span className="text-gray-800 leading-relaxed">{project.description}</span>
        </div>
      </div>
    </div>
  );
}

// ── Рендер сообщения ────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl px-4 py-2 bg-[#00CC00] text-white">
          <p className="text-sm">{msg.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] rounded-2xl px-4 py-2 bg-white text-gray-800 border border-gray-200">
        {msg.content && (
          <p className="text-sm leading-relaxed">{msg.content}</p>
        )}
        {msg.projectsData && msg.projectsData.length > 0 && (
          <ProjectsTable projects={msg.projectsData} />
        )}
        {msg.projectDetail && (
          <ProjectCard project={msg.projectDetail} />
        )}
        {msg.projectsData && msg.projectsData.length === 0 && (
          <p className="text-xs text-gray-400 mt-1 italic">Активных проектов пока нет.</p>
        )}
      </div>
    </div>
  );
}

// ── Основной компонент ──────────────────────────────────────────
export default function AiSupportButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const messageText = text ?? input;
    if (!messageText.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat-with-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Ошибка запроса');

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply ?? '',
          projectsData: data.projectsData ?? null,
          projectDetail: data.projectDetail ?? null,
        },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Извините, произошла ошибка. Попробуйте ещё раз.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickQuestions = [
    'Какие проекты доступны?',
    'Как зарегистрироваться?',
    'Как подать заявку на проект?',
  ];

  const buttonContent = (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 lg:right-8 z-[9998] w-[420px] max-w-[calc(100vw-2rem)] h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#00CC00] to-emerald-500 text-white p-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 32 32">
                  <path stroke="currentColor" strokeWidth="2" d="M4 13a3 3 0 0 1 3-3h18a3 3 0 0 1 3 3v7.92a3 3 0 0 1-2.35 2.93l-9 1.98a3 3 0 0 1-1.3 0l-9-1.98A3 3 0 0 1 4 20.92V13Z"/>
                  <circle cx="11.73" cy="17.22" r="2.44" fill="currentColor"/>
                  <circle cx="20.27" cy="17.22" r="2.44" fill="currentColor"/>
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg">VolunteerGPT</h3>
                <p className="text-xs text-white/80">AI помощник</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-gray-50">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 py-6">
                <p className="text-sm mb-4">👋 Привет! Чем могу помочь?</p>
                <div className="space-y-2">
                  {quickQuestions.map(q => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="block w-full text-left text-xs text-gray-600 hover:text-[#00CC00] bg-white p-2 rounded-lg border border-gray-200 hover:border-[#00CC00] transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <MessageBubble key={idx} msg={msg} />
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"/>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}/>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}/>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef}/>
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-gray-200 flex-shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Напишите сообщение..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent text-sm"
                disabled={loading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="bg-[#00CC00] hover:bg-[#00b300] disabled:bg-gray-300 text-white p-2 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="fixed bottom-6 right-6 lg:bottom-8 lg:right-8 z-[9999] w-40 h-14 bg-gradient-to-br from-[#00CC00] to-emerald-500 text-white rounded-full shadow-2xl hover:shadow-[#00CC00]/50 transition-shadow duration-300 flex items-center justify-center"
        aria-label="VolunteerGPT"
      >
        <span className={`font-bold text-base whitespace-nowrap absolute transition-all duration-300 ${isHovered ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`}>
          VolunteerGPT
        </span>
        <div className={`absolute flex items-center justify-center transition-all duration-300 ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 32 32">
            <path stroke="currentColor" strokeWidth="2" d="M4 13a3 3 0 0 1 3-3h18a3 3 0 0 1 3 3v7.92a3 3 0 0 1-2.35 2.93l-9 1.98a3 3 0 0 1-1.3 0l-9-1.98A3 3 0 0 1 4 20.92V13Z"/>
            <circle cx="11.73" cy="17.22" r="2.44" fill="currentColor"/>
            <circle cx="20.27" cy="17.22" r="2.44" fill="currentColor"/>
            <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="m15.8 9.9-3.46-3.45m4.88 3.26 3.46-3.46"/>
          </svg>
        </div>
      </button>
    </>
  );

  if (!mounted || typeof window === 'undefined') return null;
  return createPortal(buttonContent, document.body);
}
