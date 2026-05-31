'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import VolunteerNav from '../../components/VolunteerNav';
import AiSupportButton from '@/app/components/AiSupportButton';
import LocationViewer from '@/app/components/LocationViewer';
import { useTranslation } from '@/app/i18n/useTranslation';
import { Tooltip } from '@/app/components/Tooltip';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

interface Category {
  id: string;
  name: string;
}

interface Organizer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  organizerProfile?: {
    organizationName: string;
    organizationDescription?: string;
  };
}

interface Skill {
  id: string;
  name: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  requiredVolunteers: number;
  deadline: string;
  status: string;
  requiredSkill?: Skill;
}

interface Project {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  startDate: string;
  endDate: string;
  maxVolunteers: number;
  currentVolunteers: number;
  status: string;
  category: Category;
  organizer: Organizer;
  createdAt: string;
}

interface CommentUser {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: string;
  organizerProfile?: { organizationName: string } | null;
}

interface Comment {
  id: string;
  text: string;
  createdAt: string;
  user: CommentUser;
  replies?: Comment[];
}

export default function ProjectDetail() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const { t, locale } = useTranslation('volunteer');

  const [user, setUser] = useState<User | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  // флаг чтобы locale-эффект не запускался до завершения первичной загрузки
  const [initialized, setInitialized] = useState(false);

  // Комментарии
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState('');

  // Ответы на комментарии
  const [replyingTo, setReplyingTo] = useState<string | null>(null); // id комментария
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replyError, setReplyError] = useState('');

  // Закладки
  const [isSaved, setIsSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Публичная ссылка — доступна всем без регистрации
  const getShareUrl = () => {
    const base = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    return `${base}/p/${projectId}`;
  };

  useEffect(() => {
    const init = async () => {
      let loggedInUser: User | null = null;
      // Проверяем авторизацию (необязательно — страница публичная)
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          if (data.user?.role === 'volunteer') {
            loggedInUser = data.user;
            setUser(data.user);
          }
        }
      } catch {}
      // Загружаем проект (доступно всем), передаём флаг авторизации
      await loadProject(locale, !!loggedInUser);

      // Статус закладки — только для авторизованных
      if (loggedInUser) {
        try {
          const savedRes = await fetch(`/api/volunteer/saved-projects/${projectId}`);
          if (savedRes.ok) {
            const savedData = await savedRes.json();
            setIsSaved(savedData.saved);
          }
        } catch {}
      }

      setLoading(false);
      setInitialized(true);
    };
    init();
  }, [projectId]);

  // Перезагружаем данные при смене языка (только после первичной инициализации)
  useEffect(() => {
    if (initialized) {
      loadProject(locale, !!user);
    }
  }, [locale]);

  const loadProject = async (loc: string = 'ru', isAuth: boolean = false) => {
    try {
      // Загружаем данные проекта — API публичный, не требует авторизации
      const projectRes = await fetch(`/api/projects/${projectId}?locale=${loc}`);

      if (projectRes.ok) {
        const projectData = await projectRes.json();
        setProject(projectData.project);
        setNotFound(false);
      } else {
        setProject(null);
        setNotFound(true);
        return;
      }

      // Задачи доступны только организатору/администратору — загружаем только если авторизован
      if (isAuth) {
        try {
          const tasksRes = await fetch(`/api/projects/${projectId}/tasks?locale=${loc}`);
          if (tasksRes.ok) {
            const tasksData = await tasksRes.json();
            setTasks(tasksData.tasks || []);
          }
        } catch {}
      }

      // Статус заявки — только для авторизованных
      if (isAuth) {
        await checkApplicationStatus();
      }

      // Комментарии загружаем для всех (публичные)
      await loadComments();
    } catch (error) {
      console.error('Ошибка загрузки проекта:', error);
      setProject(null);
      setNotFound(true);
    }
  };

  const checkApplicationStatus = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/apply`);
      if (response.ok) {
        const data = await response.json();
        // Если есть заявка, устанавливаем статус
        if (data.hasApplied) {
          setHasApplied(true);
          setApplicationStatus(data.status);
        }
      }
    } catch (error) {
      console.error('Ошибка проверки статуса заявки:', error);
    }
  };

  const loadComments = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch {}
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;
    setCommentSubmitting(true);
    setCommentError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: commentText.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments(prev => [data.comment, ...prev]);
        setCommentText('');
      } else {
        const data = await res.json();
        setCommentError(data.error || 'Ошибка при отправке');
      }
    } catch {
      setCommentError('Ошибка сети');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string, parentId?: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/comments?commentId=${commentId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (parentId) {
          // удаляем ответ внутри родительского комментария
          setComments(prev => prev.map(c =>
            c.id === parentId
              ? { ...c, replies: (c.replies || []).filter(r => r.id !== commentId) }
              : c
          ));
        } else {
          setComments(prev => prev.filter(c => c.id !== commentId));
        }
      }
    } catch {}
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!replyText.trim()) return;
    setReplySubmitting(true);
    setReplyError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: replyText.trim(), parentId }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments(prev => prev.map(c =>
          c.id === parentId
            ? { ...c, replies: [...(c.replies || []), data.comment] }
            : c
        ));
        setReplyText('');
        setReplyingTo(null);
      } else {
        const data = await res.json();
        setReplyError(data.error || 'Ошибка при отправке');
      }
    } catch {
      setReplyError('Ошибка сети');
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleToggleSave = async () => {
    if (!user) { router.push('/login'); return; }
    if (saveLoading) return;
    setSaveLoading(true);
    try {
      const method = isSaved ? 'DELETE' : 'POST';
      const res = await fetch(`/api/volunteer/saved-projects/${projectId}`, { method });
      if (res.ok) {
        const data = await res.json();
        setIsSaved(data.saved);
      }
    } catch {
      // игнорируем
    } finally {
      setSaveLoading(false);
    }
  };

  const handleApply = () => {
    if (!user) { router.push('/login'); return; }
    if (!project) return;
    router.push(`/volunteer/projects/${projectId}/apply`);
  };

  const handleCopyLink = async () => {
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const handleNativeShare = async () => {
    const url = getShareUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: project?.title || 'Волонтёрский проект',
          text: project?.description?.slice(0, 120) || '',
          url,
        });
      } catch { /* пользователь закрыл диалог */ }
    } else {
      setShowShareModal(true);
    }
  };

  const handleShare = (platform: 'whatsapp' | 'telegram' | 'vk' | 'facebook') => {
    const url = getShareUrl();
    const title = project?.title || '';
    const text = `${title}\n${url}`;

    const urls: Record<string, string> = {
      whatsapp: `https://api.whatsapp.com/send/?text=${encodeURIComponent(text)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
      vk:       `https://vk.com/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    };

    window.open(urls[platform], '_blank', 'noopener,noreferrer,width=600,height=500');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00] mx-auto"></div>
          <p className="mt-4 text-gray-600">{t.common?.loading || 'Загрузка...'}</p>
        </div>
      </div>
    );
  }

  if (!loading && notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Проект не найден</h2>
          <p className="text-gray-500 mb-6">Возможно, проект был удалён или ссылка устарела.</p>
          <button
            onClick={() => router.push('/volunteer/projects')}
            className="px-6 py-2 bg-[#00CC00] text-white rounded-lg font-medium hover:bg-[#00b300] transition-colors"
          >
            Все проекты
          </button>
        </div>
      </div>
    );
  }

  if (!project) return null;

  const startDate = new Date(project.startDate);
  const endDate = new Date(project.endDate);
  const spotsLeft = project.maxVolunteers - project.currentVolunteers;
  const isActive = endDate > new Date();

  return (
      <div className="min-h-screen bg-green-50">
        {user && <VolunteerNav user={user} />}

        <div className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 ${user ? 'pt-24' : 'pt-8'}`}>
          {/* Header with back button */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-xs font-medium">{t.common?.back || 'Назад'}</span>
            </button>

            <div className="flex items-center gap-3">
              {/* Кнопка поделиться */}
              <button
                onClick={handleNativeShare}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                {t.projects?.share || 'Поделиться'}
              </button>

              <button
                onClick={handleToggleSave}
                disabled={saveLoading}
                title={isSaved ? 'Убрать из сохранённых' : 'Сохранить проект'}
                className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors shadow-sm border ${
                  isSaved
                    ? 'bg-[#00CC00] border-[#00CC00] hover:bg-[#00b300]'
                    : 'bg-white border-gray-300 hover:bg-gray-50'
                } ${saveLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <svg
                  className={`w-5 h-5 ${isSaved ? 'text-white' : 'text-gray-600'}`}
                  fill={isSaved ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            </div>

            {/* ── Модальное окно «Поделиться» ── */}
            {showShareModal && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                onClick={() => setShowShareModal(false)}
              >
                <div
                  className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                  onClick={e => e.stopPropagation()}
                >
                  {/* Шапка */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h3 className="text-base font-semibold text-gray-900">Поделиться проектом</h3>
                    <button
                      onClick={() => setShowShareModal(false)}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="px-6 py-5 space-y-5">
                    {/* Превью проекта */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                      {project.imageUrl ? (
                        <img src={project.imageUrl} alt={project.title} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#00CC00] to-emerald-500 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">{project.title}</p>
                        <p className="text-xs text-gray-500 truncate">{project.location}</p>
                      </div>
                    </div>

                    {/* Поле ссылки */}
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Ссылка на проект</p>
                      <div className="flex items-center gap-2">
                        <a
                          href={getShareUrl()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-blue-600 underline truncate font-mono hover:bg-blue-50 hover:border-blue-300 transition-colors"
                        >
                          {getShareUrl()}
                        </a>
                        <button
                          onClick={handleCopyLink}
                          className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${
                            copySuccess
                              ? 'bg-green-500 text-white'
                              : 'bg-[#00CC00] text-white hover:bg-[#00b300]'
                          }`}
                        >
                          {copySuccess ? (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Скопировано
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              Копировать
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Социальные сети */}
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-3">Поделиться через</p>
                      <div className="grid grid-cols-4 gap-3">
                        {/* WhatsApp */}
                        <button
                          onClick={() => handleShare('whatsapp')}
                          className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-green-50 transition-colors group"
                        >
                          <div className="w-11 h-11 rounded-full bg-[#25D366] flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                          </div>
                          <span className="text-xs text-gray-600">WhatsApp</span>
                        </button>

                        {/* Telegram */}
                        <button
                          onClick={() => handleShare('telegram')}
                          className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-blue-50 transition-colors group"
                        >
                          <div className="w-11 h-11 rounded-full bg-[#2AABEE] flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                            </svg>
                          </div>
                          <span className="text-xs text-gray-600">Telegram</span>
                        </button>

                        {/* ВКонтакте */}
                        <button
                          onClick={() => handleShare('vk')}
                          className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-blue-50 transition-colors group"
                        >
                          <div className="w-11 h-11 rounded-full bg-[#4C75A3] flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.391 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.523-2.049-1.714-1.033-1.01-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.566c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.253-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.049.17.474-.085.716-.576.716z"/>
                            </svg>
                          </div>
                          <span className="text-xs text-gray-600">ВКонтакте</span>
                        </button>

                        {/* Facebook */}
                        <button
                          onClick={() => handleShare('facebook')}
                          className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-blue-50 transition-colors group"
                        >
                          <div className="w-11 h-11 rounded-full bg-[#1877F2] flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                          </div>
                          <span className="text-xs text-gray-600">Facebook</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Column - Image and Apply Button */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Project Image */}
                <div className="relative h-48 bg-gradient-to-br from-[#00CC00] to-emerald-600">
                  {project.imageUrl ? (
                    <img 
                      src={project.imageUrl} 
                      alt={project.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-20 h-20 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="p-4 sm:p-6">
                  {/* Volunteers Count */}
                  <div className="text-center mb-4 pb-4 border-b border-gray-100">
                    <p className="text-xs text-gray-600">
                      <span className="font-bold text-xl text-gray-900 block mb-1">{project.currentVolunteers}</span>
                      {t.projects?.volunteersApplied || 'волонтёра подали заявку на это доброе дело'}
                    </p>
                  </div>

                  {/* Apply Button */}
                  <button
                    onClick={handleApply}
                    disabled={!isActive || spotsLeft === 0 || hasApplied}
                    className={`w-full py-3 rounded-lg font-semibold text-sm transition-colors ${
                      hasApplied
                        ? applicationStatus === 'approved'
                          ? 'bg-green-100 text-green-700 cursor-not-allowed'
                          : applicationStatus === 'rejected'
                          ? 'bg-red-100 text-red-700 cursor-not-allowed'
                          : 'bg-orange-100 text-orange-700 cursor-not-allowed'
                        : !user
                        ? 'bg-[#00CC00] text-white hover:bg-[#00b300]'
                        : isActive && spotsLeft > 0
                        ? 'bg-[#00CC00] text-white hover:bg-[#00b300]'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {hasApplied
                      ? applicationStatus === 'pending'
                        ? (t.projects?.appPending || 'Ожидание ответа')
                        : applicationStatus === 'approved'
                        ? (t.projects?.appApproved || 'Заявка одобрена')
                        : applicationStatus === 'rejected'
                        ? (t.projects?.appRejected || 'Заявка отклонена')
                        : (t.projects?.appPending || 'Ожидание ответа')
                      : !user
                      ? 'Войти и подать заявку'
                      : !isActive
                      ? (t.status?.completed || 'Проект завершен')
                      : spotsLeft === 0
                      ? (t.projects?.noSpots || 'Мест нет')
                      : (t.projects?.applyButton || 'Подать заявку')
                    }
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column - Project Details */}
            <div className="lg:col-span-2 space-y-4">
              {/* Title */}
              <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>

              {/* Main Info and Contact Person - Side by Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Main Info Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <h2 className="text-base font-bold text-gray-900 mb-4">{t.projects?.mainInfo || 'Основная информация'}</h2>
                  
                  <div className="space-y-4">
                    {/* Organizer */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-[#00CC00] rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-900">
                          {project.organizer.organizerProfile?.organizationName || 
                           `${project.organizer.firstName} ${project.organizer.lastName}`}
                        </p>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <LocationViewer 
                          location={project.location}
                          lat={project.latitude ?? undefined}
                          lon={project.longitude ?? undefined}
                        />
                      </div>
                    </div>

                    {/* Date */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-900">
                          {startDate.toLocaleDateString(locale === 'kg' ? 'ky-KG' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })} - {endDate.toLocaleDateString(locale === 'kg' ? 'ky-KG' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          10:00 - 18:00
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Person Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <h2 className="text-base font-bold text-gray-900 mb-4">{t.projects?.contactPerson || 'Контактное лицо'}</h2>
                  
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                      {project.organizer.avatarUrl ? (
                        <img src={project.organizer.avatarUrl} alt={t.projects?.organizer || 'Организатор'} className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {project.organizer.firstName} {project.organizer.lastName}
                      </p>
                      <p className="text-xs text-gray-600">
                        {t.projects?.organizer || 'Организатор'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-gray-700">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>{project.organizer.phone || '+996 XXX XXX XXX'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-700">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>{project.organizer.email}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h2 className="text-base font-bold text-gray-900 mb-4">{t.projects?.description || 'Описание'}</h2>
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {project.description}
                  </p>
                </div>
              </div>

              {/* Tasks */}
              {tasks.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <h2 className="text-base font-bold text-gray-900 mb-4">{t.projects?.tasks || 'Задачи проекта'}</h2>
                  <div className="space-y-3">
                    {tasks.map((task) => (
                      <div key={task.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-xs font-semibold text-gray-900">{task.title}</h3>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium whitespace-nowrap ml-2">
                            {task.requiredVolunteers} {t.projects?.personCount || 'чел.'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{task.description}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          {task.requiredSkill && (
                            <div className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                              </svg>
                              <span>{task.requiredSkill.name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{t.projects?.taskDeadlinePrefix || 'До'} {new Date(task.deadline).toLocaleDateString(locale === 'kg' ? 'ky-KG' : 'ru-RU', { day: 'numeric', month: 'short' })}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Required Skills */}
              {tasks.some(task => task.requiredSkill) && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <h2 className="text-base font-bold text-gray-900 mb-4">{t.projects?.requirements || 'Требуемые навыки'}</h2>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(tasks.filter(task => task.requiredSkill).map(task => task.requiredSkill!.name))).map((skill) => (
                      <span key={skill} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                        #{skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Комментарии ── */}
            <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Комментарии
                {comments.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-normal">
                    {comments.length}
                  </span>
                )}
              </h2>

              {/* Форма добавления */}
              {user ? (
                <div className="mb-6">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.firstName} className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#00CC00] flex items-center justify-center text-white font-bold text-xs">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        placeholder="Напишите комментарий..."
                        rows={3}
                        maxLength={1000}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#00CC00]/30 focus:border-[#00CC00] transition-colors"
                      />
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-xs ${commentText.length > 900 ? 'text-orange-500' : 'text-gray-400'}`}>
                          {commentText.length}/1000
                        </span>
                        <div className="flex items-center gap-2">
                          {commentError && (
                            <span className="text-xs text-red-500">{commentError}</span>
                          )}
                          <button
                            onClick={handleSubmitComment}
                            disabled={!commentText.trim() || commentSubmitting}
                            className="px-4 py-2 bg-[#00CC00] text-white rounded-lg text-xs font-medium hover:bg-[#00b300] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                          >
                            {commentSubmitting ? (
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                              </svg>
                            )}
                            Отправить
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl text-center">
                  <p className="text-xs text-gray-500 mb-3">Войдите, чтобы оставить комментарий</p>
                  <button
                    onClick={() => router.push('/login')}
                    className="px-5 py-2 bg-[#00CC00] text-white rounded-lg text-xs font-medium hover:bg-[#00b300] transition-colors"
                  >
                    Войти
                  </button>
                </div>
              )}

              {/* Список комментариев */}
              {comments.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-xs">Будьте первым, кто оставит комментарий</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id}>
                      {/* Основной комментарий */}
                      <div className="flex gap-3 group">
                        <div className="flex-shrink-0">
                          {comment.user.avatarUrl ? (
                            <img src={comment.user.avatarUrl} alt={comment.user.firstName} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white font-bold text-xs">
                              {comment.user.firstName?.[0]}{comment.user.lastName?.[0]}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-gray-900">
                                  {comment.user.role === 'organizer' && comment.user.organizerProfile?.organizationName
                                    ? comment.user.organizerProfile.organizationName
                                    : `${comment.user.firstName} ${comment.user.lastName}`}
                                </span>
                                {comment.user.role === 'organizer' && (
                                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium">
                                    Организатор
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-gray-400">
                                  {new Date(comment.createdAt).toLocaleDateString('ru-RU', {
                                    day: 'numeric', month: 'short', year: 'numeric'
                                  })}
                                </span>
                                {user && user.id === comment.user.id && (
                                  <Tooltip text="Удалить">
                                    <button
                                      onClick={() => handleDeleteComment(comment.id)}
                                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded transition-all"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </Tooltip>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-gray-700 whitespace-pre-wrap break-words">{comment.text}</p>
                          </div>

                          {/* Кнопка «Ответить» */}
                          <div className="mt-1 ml-1">
                            {user ? (
                              <button
                                onClick={() => {
                                  setReplyingTo(replyingTo === comment.id ? null : comment.id);
                                  setReplyText('');
                                  setReplyError('');
                                }}
                                className="text-[11px] font-medium text-gray-400 hover:text-[#00CC00] transition-colors"
                              >
                                {replyingTo === comment.id ? 'Отмена' : 'Ответить'}
                              </button>
                            ) : (
                              <button
                                onClick={() => router.push('/login')}
                                className="text-[11px] font-medium text-gray-400 hover:text-[#00CC00] transition-colors"
                              >
                                Ответить
                              </button>
                            )}
                            {(comment.replies?.length ?? 0) > 0 && (
                              <span className="ml-2 text-[10px] text-gray-400">
                                {comment.replies!.length} {comment.replies!.length === 1 ? 'ответ' : comment.replies!.length < 5 ? 'ответа' : 'ответов'}
                              </span>
                            )}
                          </div>

                          {/* Форма ответа */}
                          {replyingTo === comment.id && (
                            <div className="mt-2 flex gap-2">
                              <div className="flex-shrink-0">
                                {user?.avatarUrl ? (
                                  <img src={user.avatarUrl} alt={user.firstName} className="w-7 h-7 rounded-full object-cover" />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-[#00CC00] flex items-center justify-center text-white font-bold text-[10px]">
                                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1">
                                <textarea
                                  value={replyText}
                                  onChange={e => setReplyText(e.target.value)}
                                  placeholder={`Ответить ${comment.user.firstName}…`}
                                  rows={2}
                                  maxLength={1000}
                                  autoFocus
                                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#00CC00]/30 focus:border-[#00CC00] transition-colors"
                                />
                                <div className="flex items-center justify-between mt-1">
                                  <span className={`text-[10px] ${replyText.length > 900 ? 'text-orange-500' : 'text-gray-400'}`}>
                                    {replyText.length}/1000
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    {replyError && <span className="text-[10px] text-red-500">{replyError}</span>}
                                    <button
                                      onClick={() => handleSubmitReply(comment.id)}
                                      disabled={!replyText.trim() || replySubmitting}
                                      className="px-3 py-1.5 bg-[#00CC00] text-white rounded-lg text-[11px] font-medium hover:bg-[#00b300] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                                    >
                                      {replySubmitting ? (
                                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                      ) : 'Отправить'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Ответы на комментарий */}
                          {(comment.replies?.length ?? 0) > 0 && (
                            <div className="mt-2 space-y-2 border-l-2 border-gray-100 pl-3 ml-1">
                              {comment.replies!.map((reply) => (
                                <div key={reply.id} className="flex gap-2 group/reply">
                                  <div className="flex-shrink-0">
                                    {reply.user.avatarUrl ? (
                                      <img src={reply.user.avatarUrl} alt={reply.user.firstName} className="w-7 h-7 rounded-full object-cover" />
                                    ) : (
                                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white font-bold text-[10px]">
                                        {reply.user.firstName?.[0]}{reply.user.lastName?.[0]}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="bg-gray-50 rounded-xl px-3 py-2">
                                      <div className="flex items-center justify-between mb-0.5">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-xs font-semibold text-gray-900">
                                            {reply.user.role === 'organizer' && reply.user.organizerProfile?.organizationName
                                              ? reply.user.organizerProfile.organizationName
                                              : `${reply.user.firstName} ${reply.user.lastName}`}
                                          </span>
                                          {reply.user.role === 'organizer' && (
                                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium">
                                              Организатор
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[10px] text-gray-400">
                                            {new Date(reply.createdAt).toLocaleDateString('ru-RU', {
                                              day: 'numeric', month: 'short', year: 'numeric'
                                            })}
                                          </span>
                                          {user && user.id === reply.user.id && (
                                            <Tooltip text="Удалить">
                                              <button
                                                onClick={() => handleDeleteComment(reply.id, comment.id)}
                                                className="opacity-0 group-hover/reply:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded transition-all"
                                              >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                              </button>
                                            </Tooltip>
                                          )}
                                        </div>
                                      </div>
                                      <p className="text-xs text-gray-700 whitespace-pre-wrap break-words">{reply.text}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {user && <AiSupportButton />}
      </div>
  );
}
