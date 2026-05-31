'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Project {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  location: string;
  startDate: string;
  endDate: string;
  maxVolunteers: number;
  currentVolunteers: number;
  status: string;
  category: { name: string; icon: string; slug: string };
  organizer: {
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    organizerProfile?: { organizationName: string };
  };
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  recruiting: { label: 'Набор волонтёров',  color: 'bg-green-100 text-green-700' },
  upcoming:   { label: 'Скоро начнётся',    color: 'bg-blue-100 text-blue-700' },
  active:     { label: 'Идёт сейчас',       color: 'bg-purple-100 text-purple-700' },
  completed:  { label: 'Завершён',           color: 'bg-gray-100 text-gray-600' },
};

const PUBLIC_STATUSES = ['recruiting', 'upcoming', 'active', 'completed'];

export default function PublicProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copyDone, setCopyDone] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/projects/${id}?locale=ru`);
        if (!res.ok) { setNotFound(true); return; }
        const data = await res.json();
        const p: Project = data.project;

        // Показываем только опубликованные проекты
        if (!PUBLIC_STATUSES.includes(p.status)) {
          setNotFound(true);
          return;
        }
        setProject(p);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleCopy = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 2000);
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00]" />
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-800">Проект не найден</h2>
        <p className="text-gray-500 text-sm">Ссылка недействительна или проект был удалён.</p>
        <Link href="/login" className="mt-2 px-5 py-2 bg-[#00CC00] text-white rounded-xl text-sm font-medium hover:bg-[#00b300] transition-colors">
          Войти на сайт
        </Link>
      </div>
    );
  }

  const st = STATUS_LABELS[project.status];
  const spotsLeft = project.maxVolunteers - project.currentVolunteers;
  const isOpen = project.status === 'recruiting';
  const progressPct = Math.min(100, Math.round((project.currentVolunteers / project.maxVolunteers) * 100));

  return (
    <div className="min-h-screen bg-green-50">
      {/* ── Шапка ───────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="ВолонтёрКР" className="w-7 h-7 object-contain" />
            <span className="text-base font-bold text-gray-900">
              Волонтёр<span className="text-[#00CC00]">КР</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login"
              className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-[#00CC00] transition-colors">
              Войти
            </Link>
            <Link href="/register"
              className="px-3 py-1.5 bg-[#00CC00] text-white text-sm font-medium rounded-lg hover:bg-[#00b300] transition-colors">
              Регистрация
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 pb-32">

        {/* ── Изображение ─────────────────────────────────────────── */}
        {project.imageUrl && (
          <div className="rounded-2xl overflow-hidden mb-5 shadow-md">
            <img src={project.imageUrl} alt={project.title} className="w-full h-56 sm:h-72 object-cover" />
          </div>
        )}

        {/* ── Заголовок ───────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 mb-4 shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">{project.title}</h1>
            {st && (
              <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${st.color}`}>
                {st.label}
              </span>
            )}
          </div>

          {/* Категория */}
          <p className="text-xs text-gray-400 mb-4">{project.category.name}</p>

          {/* Мета-данные */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Локация */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-7 h-7 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="truncate">{project.location}</span>
            </div>

            {/* Даты */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-7 h-7 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span>{fmt(project.startDate)} — {fmt(project.endDate)}</span>
            </div>

            {/* Волонтёры */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Волонтёры</span>
                <span className="font-medium text-gray-700">{project.currentVolunteers} / {project.maxVolunteers}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#00CC00] rounded-full transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              {isOpen && spotsLeft > 0 && (
                <p className="text-xs text-green-600 mt-1">Осталось {spotsLeft} мест</p>
              )}
              {isOpen && spotsLeft <= 0 && (
                <p className="text-xs text-orange-500 mt-1">Места закончились</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Описание ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 mb-4 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-3">О проекте</h2>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{project.description}</p>
        </div>

        {/* ── Организатор ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 mb-4 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Организатор</h2>
          <div className="flex items-center gap-3">
            {project.organizer.avatarUrl ? (
              <img src={project.organizer.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#00CC00] flex items-center justify-center text-white font-bold shrink-0">
                {project.organizer.firstName[0]}{project.organizer.lastName[0]}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">
                {project.organizer.firstName} {project.organizer.lastName}
              </p>
              {project.organizer.organizerProfile?.organizationName && (
                <p className="text-xs text-gray-500">{project.organizer.organizerProfile.organizationName}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Кнопка копирования ─────────────────────────────────── */}
        <button
          onClick={handleCopy}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border transition-all ${
            copyDone
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          {copyDone ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Ссылка скопирована
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Скопировать ссылку
            </>
          )}
        </button>
      </main>

      {/* ── Закреплённый баннер внизу ───────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {isOpen ? 'Хочешь принять участие?' : 'Присоединяйся к нам!'}
            </p>
            <p className="text-xs text-gray-500">
              {isOpen
                ? 'Зарегистрируйся и подай заявку на проект'
                : 'Регистрируйся и находи интересные проекты'}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href="/login"
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Войти
            </Link>
            <Link href="/register"
              className="px-4 py-2 bg-[#00CC00] text-white rounded-xl text-xs font-medium hover:bg-[#00b300] transition-colors">
              Регистрация
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
