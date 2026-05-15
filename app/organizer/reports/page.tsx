'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OrganizerNav from '../components/OrganizerNav';
import OrganizerSidebar from '../components/OrganizerSidebar';
import AiSupportButton from '@/app/components/AiSupportButton';
import DynamicContent from '@/app/components/DynamicContent';
import { SidebarProvider } from '@/app/contexts/SidebarContext';
import { useToast } from '@/app/components/ToastContainer';
import CustomDatePicker from '@/app/components/CustomDatePicker';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

interface ProjectReport {
  id: string;
  title: string;
  status: string;
  category: string;
  location: string;
  startDate: string;
  endDate: string;
  maxVolunteers: number;
  currentVolunteers: number;
  totalParticipants: number;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  participants: { name: string; email: string; city: string; joinedAt: string }[];
}

interface HistoryEntry {
  id: string;
  format: 'pdf' | 'excel';
  type: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  params: { type: string; startDate: string; endDate: string };
}

const STATUS_LABELS: Record<string, string> = {
  recruiting: 'Набор волонтёров',
  active: 'Активный',
  upcoming: 'Скоро',
  completed: 'Завершён',
  rejected: 'Отклонён',
  cancelled: 'Отменён',
};

const TYPE_LABELS: Record<string, string> = {
  all: 'Все проекты',
  active: 'Активные проекты',
  completed: 'Завершённые проекты',
};

const HISTORY_KEY = 'organizer_report_history';

export default function OrganizerReports() {
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reportType, setReportType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) { router.push('/login'); return; }
        const data = await response.json();
        if (data.user.role !== 'organizer') { router.push('/dashboard'); return; }
        setUser(data.user);
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();

    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) setHistory(JSON.parse(saved));
  }, [router]);

  const saveToHistory = (format: 'pdf' | 'excel', params: { type: string; startDate: string; endDate: string }) => {
    const entry: HistoryEntry = {
      id: Date.now().toString(),
      format,
      type: params.type,
      startDate: params.startDate,
      endDate: params.endDate,
      createdAt: new Date().toISOString(),
      params,
    };
    const updated = [entry, ...history].slice(0, 20);
    setHistory(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };

  const fetchReportData = async (params: { type: string; startDate: string; endDate: string }): Promise<ProjectReport[] | null> => {
    const query = new URLSearchParams({ type: params.type });
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);

    const res = await fetch(`/api/organizer/reports?${query}`);
    if (!res.ok) { toast.error('Ошибка при получении данных'); return null; }
    const data = await res.json();
    return data.projects as ProjectReport[];
  };

  const handleGeneratePDF = async (params?: { type: string; startDate: string; endDate: string }) => {
    const p = params || { type: reportType, startDate, endDate };
    setGenerating(true);
    try {
      const projects = await fetchReportData(p);
      if (!projects) return;
      if (projects.length === 0) { toast.error('Нет данных для отчёта за выбранный период'); return; }

      const periodStr = p.startDate && p.endDate
        ? `Период: ${p.startDate} — ${p.endDate}`
        : 'Все даты';

      const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8"/>
  <title>Отчёт по проектам</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 30px; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    .meta { color: #555; font-size: 12px; margin-bottom: 20px; }
    .summary { background: #f4f9f4; border: 1px solid #d1e7d1; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .summary-item { text-align: center; }
    .summary-item .num { font-size: 22px; font-weight: bold; color: #00aa00; }
    .summary-item .lbl { font-size: 11px; color: #555; margin-top: 2px; }
    .project { border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 16px; page-break-inside: avoid; }
    .project-title { font-size: 15px; font-weight: bold; margin-bottom: 8px; color: #111; }
    .badges { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
    .badge { font-size: 11px; padding: 2px 8px; border-radius: 99px; font-weight: 600; }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-gray { background: #f3f4f6; color: #374151; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; font-size: 12px; color: #444; margin-bottom: 10px; }
    .info-grid span { display: flex; gap: 4px; }
    .info-grid b { color: #111; }
    .progress-bar { height: 6px; background: #e5e7eb; border-radius: 3px; margin: 8px 0; }
    .progress-fill { height: 100%; background: #00cc00; border-radius: 3px; }
    .participants-title { font-size: 12px; font-weight: bold; color: #333; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #f9fafb; text-align: left; padding: 5px 8px; border-bottom: 1px solid #e5e7eb; color: #555; font-weight: 600; }
    td { padding: 5px 8px; border-bottom: 1px solid #f3f4f6; }
    tr:last-child td { border-bottom: none; }
    @media print {
      body { padding: 15px; }
      .project { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>Отчёт по проектам</h1>
  <div class="meta">
    Организатор: ${user?.firstName} ${user?.lastName} &nbsp;|&nbsp;
    ${TYPE_LABELS[p.type] || p.type} &nbsp;|&nbsp;
    ${periodStr} &nbsp;|&nbsp;
    Сформирован: ${new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })}
  </div>

  <div class="summary">
    <div class="summary-item"><div class="num">${projects.length}</div><div class="lbl">Проектов</div></div>
    <div class="summary-item"><div class="num">${projects.reduce((s, p) => s + p.totalParticipants, 0)}</div><div class="lbl">Участников</div></div>
    <div class="summary-item"><div class="num">${projects.reduce((s, p) => s + p.totalTasks, 0)}</div><div class="lbl">Задач всего</div></div>
    <div class="summary-item"><div class="num">${projects.reduce((s, p) => s + p.completedTasks, 0)}</div><div class="lbl">Выполнено</div></div>
  </div>

  ${projects.map((proj) => `
  <div class="project">
    <div class="project-title">${proj.title}</div>
    <div class="badges">
      <span class="badge badge-green">${STATUS_LABELS[proj.status] || proj.status}</span>
      <span class="badge badge-blue">${proj.category}</span>
    </div>
    <div class="info-grid">
      <span><b>Локация:</b> ${proj.location}</span>
      <span><b>Волонтёры:</b> ${proj.currentVolunteers} / ${proj.maxVolunteers}</span>
      <span><b>Период:</b> ${proj.startDate} — ${proj.endDate}</span>
      <span><b>Задачи:</b> ${proj.completedTasks} / ${proj.totalTasks} (${proj.completionRate}%)</span>
    </div>
    <div class="progress-bar"><div class="progress-fill" style="width:${proj.completionRate}%"></div></div>
    ${proj.participants.length > 0 ? `
    <div class="participants-title">Участники (${proj.participants.length})</div>
    <table>
      <thead><tr><th>Имя</th><th>Email</th><th>Город</th><th>Дата вступления</th></tr></thead>
      <tbody>
        ${proj.participants.map((part) => `
        <tr><td>${part.name}</td><td>${part.email}</td><td>${part.city || '—'}</td><td>${part.joinedAt}</td></tr>
        `).join('')}
      </tbody>
    </table>` : '<div style="color:#999;font-size:12px">Нет участников</div>'}
  </div>`).join('')}

  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

      const win = window.open('', '_blank');
      if (!win) { toast.error('Разрешите всплывающие окна в браузере'); return; }
      win.document.write(html);
      win.document.close();

      if (!params) saveToHistory('pdf', p);
      toast.success('Отчёт открыт — сохраните как PDF через диалог печати');
    } catch (err) {
      console.error(err);
      toast.error('Ошибка при генерации PDF');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateExcel = async (params?: { type: string; startDate: string; endDate: string }) => {
    const p = params || { type: reportType, startDate, endDate };
    setGenerating(true);
    try {
      const projects = await fetchReportData(p);
      if (!projects) return;
      if (projects.length === 0) { toast.error('Нет данных для отчёта за выбранный период'); return; }

      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      const summaryRows = [
        ['Название', 'Статус', 'Категория', 'Локация', 'Начало', 'Конец', 'Волонтёры', 'Макс.', 'Задачи', 'Выполнено', '%'],
        ...projects.map((proj) => [
          proj.title,
          STATUS_LABELS[proj.status] || proj.status,
          proj.category,
          proj.location,
          proj.startDate,
          proj.endDate,
          proj.currentVolunteers,
          proj.maxVolunteers,
          proj.totalTasks,
          proj.completedTasks,
          proj.completionRate + '%',
        ]),
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      wsSummary['!cols'] = [
        { wch: 35 }, { wch: 20 }, { wch: 15 }, { wch: 20 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 8 },
        { wch: 10 }, { wch: 12 }, { wch: 8 },
      ];
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Проекты');

      const participantRows = [
        ['Проект', 'Участник', 'Email', 'Город', 'Дата вступления'],
        ...projects.flatMap((proj) =>
          proj.participants.map((part) => [proj.title, part.name, part.email, part.city, part.joinedAt])
        ),
      ];
      const wsParticipants = XLSX.utils.aoa_to_sheet(participantRows);
      wsParticipants['!cols'] = [{ wch: 35 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsParticipants, 'Участники');

      const periodStr = p.startDate && p.endDate ? `_${p.startDate}_${p.endDate}` : '';
      XLSX.writeFile(wb, `otchet_proekty${periodStr}.xlsx`);

      if (!params) saveToHistory('excel', p);
      toast.success('Excel отчёт скачан');
    } catch (err) {
      console.error(err);
      toast.error('Ошибка при генерации Excel');
    } finally {
      setGenerating(false);
    }
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

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

        <DynamicContent maxWidth="max-w-5xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Отчёты</h1>
            <p className="text-gray-600">Создавайте и скачивайте отчёты по вашим проектам</p>
          </div>

          {/* Генератор отчёта */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Создать отчёт</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Тип отчёта</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { value: 'all', label: 'Все проекты' },
                    { value: 'active', label: 'Активные проекты' },
                    { value: 'completed', label: 'Завершённые проекты' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setReportType(opt.value)}
                      className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        reportType === opt.value
                          ? 'bg-[#00CC00] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Период <span className="text-gray-400 font-normal">(необязательно)</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-2">Дата начала</label>
                    <CustomDatePicker value={startDate} onChange={setStartDate} placeholder="Выберите дату начала" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-2">Дата окончания</label>
                    <CustomDatePicker value={endDate} onChange={setEndDate} placeholder="Выберите дату окончания" minDate={startDate} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Формат отчёта</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => handleGeneratePDF()}
                    disabled={generating}
                    className="flex items-center justify-center gap-3 px-6 py-4 bg-red-50 border-2 border-red-200 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-gray-900">Скачать PDF</div>
                      <div className="text-sm text-gray-600">Откроется страница для печати</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleGenerateExcel()}
                    disabled={generating}
                    className="flex items-center justify-center gap-3 px-6 py-4 bg-green-50 border-2 border-green-200 rounded-xl hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-gray-900">Скачать Excel</div>
                      <div className="text-sm text-gray-600">Для анализа данных</div>
                    </div>
                  </button>
                </div>
              </div>

              {generating && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                  <p className="text-sm text-blue-800">Формирование отчёта...</p>
                </div>
              )}
            </div>
          </div>

          {/* История отчётов */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">История отчётов</h2>
              {history.length > 0 && (
                <button
                  onClick={() => {
                    setHistory([]);
                    localStorage.removeItem(HISTORY_KEY);
                  }}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  Очистить
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">Созданные отчёты будут отображаться здесь</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      entry.format === 'pdf' ? 'bg-red-100' : 'bg-green-100'
                    }`}>
                      <svg className={`w-5 h-5 ${entry.format === 'pdf' ? 'text-red-600' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">
                        {TYPE_LABELS[entry.type] || entry.type} · {entry.format.toUpperCase()}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {entry.startDate && entry.endDate
                          ? `${entry.startDate} — ${entry.endDate}`
                          : 'Все даты'
                        } · {fmtDate(entry.createdAt)}
                      </div>
                    </div>

                    <button
                      onClick={() => entry.format === 'pdf'
                        ? handleGeneratePDF(entry.params)
                        : handleGenerateExcel(entry.params)
                      }
                      disabled={generating}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#00CC00] hover:bg-[#00CC00]/10 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Скачать
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DynamicContent>

        <AiSupportButton />
      </div>
    </SidebarProvider>
  );
}
