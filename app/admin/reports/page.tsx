'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminNav from '../components/AdminNav';
import AdminSidebar from '../components/AdminSidebar';
import { SidebarProvider } from '@/app/contexts/SidebarContext';
import { useSidebar } from '@/app/contexts/SidebarContext';
import { useToast } from '@/app/components/ToastContainer';
import CustomDatePicker from '@/app/components/CustomDatePicker';
import { useTranslation } from '@/app/i18n/useTranslation';

interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
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

const REPORT_TYPES = [
  {
    id: 'summary',
    label: 'Сводный отчёт платформы',
    desc: 'Общая статистика: пользователи, проекты, задачи, топ волонтёры и организаторы',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
  {
    id: 'users',
    label: 'Отчёт по пользователям',
    desc: 'Список всех волонтёров и организаторов с их статусами и показателями',
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  },
  {
    id: 'projects',
    label: 'Отчёт по проектам',
    desc: 'Все проекты платформы с категориями, статусами и статистикой участия',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
];

const TYPE_LABELS: Record<string, string> = {
  summary: 'Сводный отчёт платформы',
  users: 'Отчёт по пользователям',
  projects: 'Отчёт по проектам',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик', moderation: 'На модерации', rejected: 'Отклонён',
  recruiting: 'Набор', upcoming: 'Скоро', active: 'Активный',
  completed: 'Завершён', cancelled: 'Отменён', blocked: 'Заблокирован',
};

const ROLE_LABELS: Record<string, string> = {
  volunteer: 'Волонтёр', organizer: 'Организатор', admin: 'Администратор',
};

const USER_STATUS_LABELS: Record<string, string> = {
  active: 'Активен', blocked: 'Заблокирован', inactive: 'Неактивен',
};

const HISTORY_KEY = 'admin_report_history';

// ─── HTML generators ──────────────────────────────────────────────────────────

function buildSummaryHtml(data: any, period: string, adminName: string): string {
  const t = data.totals;
  const now = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });

  const statusRows = data.projectsByStatus
    .sort((a: any, b: any) => b.count - a.count)
    .map((s: any) => `<tr><td>${STATUS_LABELS[s.status] ?? s.status}</td><td style="text-align:right;font-weight:600">${s.count}</td></tr>`)
    .join('');

  const topVolRows = data.topVolunteers.map((v: any, i: number) => `
    <tr><td>${i + 1}</td><td>${v.name}</td><td>${v.email}</td><td>${v.city ?? '—'}</td>
    <td style="text-align:right">${v.completedTasks}</td><td style="text-align:right">${v.trustScore}</td></tr>`).join('');

  const topOrgRows = data.topOrganizers.map((o: any, i: number) => `
    <tr><td>${i + 1}</td><td>${o.name}</td><td>${o.organizationName}</td>
    <td>${o.city ?? '—'}</td><td style="text-align:right">${o.projectsCount}</td></tr>`).join('');

  const catRows = data.categories.map((c: any) =>
    `<tr><td>${c.name}</td><td style="text-align:right;font-weight:600">${c.count}</td></tr>`).join('');

  const monthRegRows = data.monthlyRegistrations.map((m: any) =>
    `<tr><td>${m.label}</td><td style="text-align:right">${m.count}</td></tr>`).join('');

  const monthProjRows = data.monthlyProjects.map((m: any) =>
    `<tr><td>${m.label}</td><td style="text-align:right">${m.count}</td></tr>`).join('');

  return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"/>
<title>Сводный отчёт платформы</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a;padding:30px}
  h1{font-size:22px;margin-bottom:4px}
  h2{font-size:15px;color:#111;margin:20px 0 10px;border-bottom:2px solid #00cc00;padding-bottom:4px}
  .meta{color:#555;font-size:12px;margin-bottom:22px}
  .summary{background:#f4f9f4;border:1px solid #d1e7d1;border-radius:8px;padding:14px 18px;margin-bottom:24px;display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
  .si{text-align:center}.si .num{font-size:24px;font-weight:bold;color:#00aa00}.si .lbl{font-size:11px;color:#555;margin-top:2px}
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px}
  th{background:#f9fafb;text-align:left;padding:6px 8px;border-bottom:1px solid #e5e7eb;color:#555;font-weight:600}
  td{padding:5px 8px;border-bottom:1px solid #f3f4f6}tr:last-child td{border-bottom:none}
  @media print{body{padding:15px}.two-col{page-break-inside:avoid}}
</style></head><body>
<h1>Сводный отчёт платформы</h1>
<div class="meta">Администратор: ${adminName} &nbsp;|&nbsp; ${period} &nbsp;|&nbsp; Сформирован: ${now}</div>
<div class="summary">
  <div class="si"><div class="num">${t.totalUsers}</div><div class="lbl">Пользователей</div></div>
  <div class="si"><div class="num">${t.totalProjects}</div><div class="lbl">Проектов</div></div>
  <div class="si"><div class="num">${t.totalTasks}</div><div class="lbl">Задач</div></div>
  <div class="si"><div class="num">${t.completedTasks}</div><div class="lbl">Задач выполнено</div></div>
</div>
<div class="two-col">
  <div>
    <h2>Пользователи</h2>
    <table><tbody>
      <tr><td>Волонтёры</td><td style="text-align:right;font-weight:600">${t.totalVolunteers}</td></tr>
      <tr><td>Организаторы</td><td style="text-align:right;font-weight:600">${t.totalOrganizers}</td></tr>
    </tbody></table>
    <h2>Проекты по статусам</h2>
    <table><thead><tr><th>Статус</th><th style="text-align:right">Кол-во</th></tr></thead><tbody>${statusRows}</tbody></table>
  </div>
  <div>
    <h2>Проекты по категориям</h2>
    <table><thead><tr><th>Категория</th><th style="text-align:right">Проектов</th></tr></thead><tbody>${catRows}</tbody></table>
    <h2>Динамика регистраций (6 мес.)</h2>
    <table><thead><tr><th>Месяц</th><th style="text-align:right">Регистраций</th></tr></thead><tbody>${monthRegRows}</tbody></table>
    <h2>Динамика проектов (6 мес.)</h2>
    <table><thead><tr><th>Месяц</th><th style="text-align:right">Проектов</th></tr></thead><tbody>${monthProjRows}</tbody></table>
  </div>
</div>
<h2>Топ-10 волонтёров по выполненным задачам</h2>
<table><thead><tr><th>#</th><th>Имя</th><th>Email</th><th>Город</th><th style="text-align:right">Задач</th><th style="text-align:right">Рейтинг</th></tr></thead><tbody>${topVolRows}</tbody></table>
<h2>Топ-10 организаторов по проектам</h2>
<table><thead><tr><th>#</th><th>Имя</th><th>Организация</th><th>Город</th><th style="text-align:right">Проектов</th></tr></thead><tbody>${topOrgRows}</tbody></table>
<script>window.onload=()=>{window.print()}</script>
</body></html>`;
}

function buildUsersHtml(data: any, period: string, adminName: string): string {
  const now = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
  const volunteers = data.users.filter((u: any) => u.role === 'volunteer');
  const organizers = data.users.filter((u: any) => u.role === 'organizer');

  const volRows = volunteers.map((u: any) => `
    <tr><td>${u.name}</td><td>${u.email}</td><td>${u.city ?? '—'}</td>
    <td style="text-align:right">${u.completedTasks ?? 0}</td>
    <td style="text-align:right">${u.completedProjects ?? 0}</td>
    <td style="text-align:right">${u.trustScore ?? '0.0'}</td>
    <td>${USER_STATUS_LABELS[u.status] ?? u.status}</td>
    <td>${u.registeredAt}</td></tr>`).join('');

  const orgRows = organizers.map((u: any) => `
    <tr><td>${u.name}</td><td>${u.email}</td><td>${u.organizationName ?? '—'}</td>
    <td>${u.city ?? '—'}</td>
    <td>${u.verificationStatus === 'verified' ? 'Верифицирован' : u.verificationStatus === 'pending' ? 'На проверке' : 'Не верифицирован'}</td>
    <td>${USER_STATUS_LABELS[u.status] ?? u.status}</td>
    <td>${u.registeredAt}</td></tr>`).join('');

  return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"/>
<title>Отчёт по пользователям</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;font-size:12px;color:#1a1a1a;padding:30px}
  h1{font-size:20px;margin-bottom:4px}h2{font-size:14px;color:#111;margin:20px 0 8px;border-bottom:2px solid #00cc00;padding-bottom:3px}
  .meta{color:#555;font-size:11px;margin-bottom:20px}
  .summary{background:#f4f9f4;border:1px solid #d1e7d1;border-radius:8px;padding:12px 16px;margin-bottom:20px;display:flex;gap:30px}
  .si .num{font-size:20px;font-weight:bold;color:#00aa00}.si .lbl{font-size:11px;color:#555}
  table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:20px}
  th{background:#f9fafb;text-align:left;padding:5px 7px;border-bottom:1px solid #e5e7eb;color:#555;font-weight:600}
  td{padding:4px 7px;border-bottom:1px solid #f3f4f6}tr:last-child td{border-bottom:none}
  @media print{h2{page-break-before:auto}table{page-break-inside:auto}tr{page-break-inside:avoid}}
</style></head><body>
<h1>Отчёт по пользователям</h1>
<div class="meta">Администратор: ${adminName} &nbsp;|&nbsp; ${period} &nbsp;|&nbsp; Сформирован: ${now}</div>
<div class="summary">
  <div class="si"><div class="num">${data.users.length}</div><div class="lbl">Всего</div></div>
  <div class="si"><div class="num">${volunteers.length}</div><div class="lbl">Волонтёров</div></div>
  <div class="si"><div class="num">${organizers.length}</div><div class="lbl">Организаторов</div></div>
</div>
<h2>Волонтёры (${volunteers.length})</h2>
<table><thead><tr><th>Имя</th><th>Email</th><th>Город</th><th style="text-align:right">Задач</th><th style="text-align:right">Проектов</th><th style="text-align:right">Рейтинг</th><th>Статус</th><th>Дата рег.</th></tr></thead><tbody>${volRows || '<tr><td colspan="8" style="color:#999;text-align:center">Нет данных</td></tr>'}</tbody></table>
<h2>Организаторы (${organizers.length})</h2>
<table><thead><tr><th>Имя</th><th>Email</th><th>Организация</th><th>Город</th><th>Верификация</th><th>Статус</th><th>Дата рег.</th></tr></thead><tbody>${orgRows || '<tr><td colspan="7" style="color:#999;text-align:center">Нет данных</td></tr>'}</tbody></table>
<script>window.onload=()=>{window.print()}</script>
</body></html>`;
}

function buildProjectsHtml(data: any, period: string, adminName: string): string {
  const now = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
  const projects = data.projects;
  const completionTotal = projects.reduce((s: number, p: any) => s + p.completedTasks, 0);
  const tasksTotal = projects.reduce((s: number, p: any) => s + p.totalTasks, 0);

  const rows = projects.map((p: any) => `
    <tr>
      <td>${p.title}</td>
      <td>${STATUS_LABELS[p.status] ?? p.status}</td>
      <td>${p.category}</td>
      <td>${p.organizationName}</td>
      <td>${p.location}</td>
      <td style="text-align:right">${p.currentVolunteers}/${p.maxVolunteers}</td>
      <td style="text-align:right">${p.completedTasks}/${p.totalTasks}</td>
      <td>${p.startDate} — ${p.endDate}</td>
    </tr>`).join('');

  return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"/>
<title>Отчёт по проектам</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;font-size:11px;color:#1a1a1a;padding:30px}
  h1{font-size:20px;margin-bottom:4px}
  .meta{color:#555;font-size:11px;margin-bottom:18px}
  .summary{background:#f4f9f4;border:1px solid #d1e7d1;border-radius:8px;padding:12px 16px;margin-bottom:20px;display:flex;gap:30px}
  .si .num{font-size:20px;font-weight:bold;color:#00aa00}.si .lbl{font-size:11px;color:#555}
  table{width:100%;border-collapse:collapse;font-size:10px}
  th{background:#f9fafb;text-align:left;padding:5px 6px;border-bottom:1px solid #e5e7eb;color:#555;font-weight:600}
  td{padding:4px 6px;border-bottom:1px solid #f3f4f6}tr:last-child td{border-bottom:none}
  @media print{body{padding:10px}table{page-break-inside:auto}tr{page-break-inside:avoid}}
</style></head><body>
<h1>Отчёт по проектам</h1>
<div class="meta">Администратор: ${adminName} &nbsp;|&nbsp; ${period} &nbsp;|&nbsp; Сформирован: ${now}</div>
<div class="summary">
  <div class="si"><div class="num">${projects.length}</div><div class="lbl">Проектов</div></div>
  <div class="si"><div class="num">${projects.reduce((s: number, p: any) => s + p.participantsCount, 0)}</div><div class="lbl">Участников</div></div>
  <div class="si"><div class="num">${tasksTotal}</div><div class="lbl">Задач</div></div>
  <div class="si"><div class="num">${tasksTotal > 0 ? Math.round((completionTotal / tasksTotal) * 100) : 0}%</div><div class="lbl">Выполнено</div></div>
</div>
<table><thead><tr>
  <th>Название</th><th>Статус</th><th>Категория</th><th>Организация</th>
  <th>Локация</th><th style="text-align:right">Волонтёры</th><th style="text-align:right">Задачи</th><th>Период</th>
</tr></thead><tbody>${rows || '<tr><td colspan="8" style="color:#999;text-align:center;padding:12px">Нет данных</td></tr>'}</tbody></table>
<script>window.onload=()=>{window.print()}</script>
</body></html>`;
}

// ─── Excel builders ───────────────────────────────────────────────────────────

async function exportSummaryExcel(data: any, period: string, adminName: string, fileName: string) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const t = data.totals;
  const now = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });

  const rows: any[][] = [
    ['СВОДНЫЙ ОТЧЁТ ПЛАТФОРМЫ'], [],
    ['Администратор:', adminName], ['Период:', period], ['Дата:', now], [],
    ['ОБЩАЯ СТАТИСТИКА'],
    ['Всего пользователей:', t.totalUsers],
    ['Волонтёры:', t.totalVolunteers],
    ['Организаторы:', t.totalOrganizers],
    ['Всего проектов:', t.totalProjects],
    ['Активных проектов:', t.activeProjects],
    ['Завершённых проектов:', t.completedProjects],
    ['Всего задач:', t.totalTasks],
    ['Выполнено задач:', t.completedTasks], [],
    ['ПРОЕКТЫ ПО СТАТУСАМ'],
    ['Статус', 'Количество'],
    ...data.projectsByStatus.map((s: any) => [STATUS_LABELS[s.status] ?? s.status, s.count]), [],
    ['ПРОЕКТЫ ПО КАТЕГОРИЯМ'],
    ['Категория', 'Проектов'],
    ...data.categories.map((c: any) => [c.name, c.count]), [],
    ['ДИНАМИКА РЕГИСТРАЦИЙ (6 МЕС.)'],
    ['Месяц', 'Регистраций'],
    ...data.monthlyRegistrations.map((m: any) => [m.label, m.count]), [],
    ['ДИНАМИКА ПРОЕКТОВ (6 МЕС.)'],
    ['Месяц', 'Проектов'],
    ...data.monthlyProjects.map((m: any) => [m.label, m.count]), [],
    ['ТОП ВОЛОНТЁРЫ'],
    ['#', 'Имя', 'Email', 'Город', 'Задач выполнено', 'Рейтинг'],
    ...data.topVolunteers.map((v: any, i: number) => [i + 1, v.name, v.email, v.city ?? '—', v.completedTasks, v.trustScore]), [],
    ['ТОП ОРГАНИЗАТОРЫ'],
    ['#', 'Имя', 'Организация', 'Город', 'Проектов'],
    ...data.topOrganizers.map((o: any, i: number) => [i + 1, o.name, o.organizationName, o.city ?? '—', o.projectsCount]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 30 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Сводный отчёт');
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

async function exportUsersExcel(data: any, period: string, adminName: string, fileName: string) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const now = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });

  const volunteers = data.users.filter((u: any) => u.role === 'volunteer');
  const organizers = data.users.filter((u: any) => u.role === 'organizer');

  const volRows: any[][] = [
    ['ОТЧЁТ ПО ПОЛЬЗОВАТЕЛЯМ — ВОЛОНТЁРЫ'], [],
    ['Администратор:', adminName], ['Период:', period], ['Дата:', now], [],
    ['Имя', 'Email', 'Телефон', 'Город', 'Задач', 'Проектов', 'Рейтинг', 'Статус', 'Дата регистрации'],
    ...volunteers.map((u: any) => [u.name, u.email, u.phone, u.city ?? '—', u.completedTasks ?? 0, u.completedProjects ?? 0, u.trustScore ?? '0.0', USER_STATUS_LABELS[u.status] ?? u.status, u.registeredAt]),
  ];
  const orgRows: any[][] = [
    ['ОТЧЁТ ПО ПОЛЬЗОВАТЕЛЯМ — ОРГАНИЗАТОРЫ'], [],
    ['Администратор:', adminName], ['Период:', period], ['Дата:', now], [],
    ['Имя', 'Email', 'Телефон', 'Организация', 'Город', 'Верификация', 'Статус', 'Дата регистрации'],
    ...organizers.map((u: any) => [u.name, u.email, u.phone, u.organizationName ?? '—', u.city ?? '—', u.verificationStatus === 'verified' ? 'Верифицирован' : 'Не верифицирован', USER_STATUS_LABELS[u.status] ?? u.status, u.registeredAt]),
  ];

  const wsV = XLSX.utils.aoa_to_sheet(volRows);
  wsV['!cols'] = [{ wch: 25 }, { wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsV, 'Волонтёры');

  const wsO = XLSX.utils.aoa_to_sheet(orgRows);
  wsO['!cols'] = [{ wch: 25 }, { wch: 28 }, { wch: 16 }, { wch: 30 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsO, 'Организаторы');

  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

async function exportProjectsExcel(data: any, period: string, adminName: string, fileName: string) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const now = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });

  const rows: any[][] = [
    ['ОТЧЁТ ПО ПРОЕКТАМ'], [],
    ['Администратор:', adminName], ['Период:', period], ['Дата:', now], [],
    ['Название', 'Статус', 'Категория', 'Организация', 'Локация', 'Волонтёры', 'Участников', 'Задач', 'Выполнено', 'Начало', 'Окончание'],
    ...data.projects.map((p: any) => [
      p.title, STATUS_LABELS[p.status] ?? p.status, p.category,
      p.organizationName, p.location,
      `${p.currentVolunteers}/${p.maxVolunteers}`,
      p.participantsCount, p.totalTasks, p.completedTasks,
      p.startDate, p.endDate,
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 35 }, { wch: 14 }, { wch: 18 }, { wch: 28 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Проекты');
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function ReportsContent({ user }: { user: AdminUser }) {
  const { collapsed } = useSidebar();
  const toast = useToast();
  const { t: tAdmin } = useTranslation('admin');
  const [reportType, setReportType] = useState('summary');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  function saveToHistory(format: 'pdf' | 'excel', params: { type: string; startDate: string; endDate: string }) {
    const entry: HistoryEntry = {
      id: Date.now().toString(),
      format, type: params.type,
      startDate: params.startDate, endDate: params.endDate,
      createdAt: new Date().toISOString(), params,
    };
    const updated = [entry, ...history].slice(0, 20);
    setHistory(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  }

  async function fetchData(params: { type: string; startDate: string; endDate: string }) {
    const q = new URLSearchParams({ type: params.type });
    if (params.startDate) q.set('startDate', params.startDate);
    if (params.endDate) q.set('endDate', params.endDate);
    const res = await fetch(`/api/admin/reports?${q}`);
    if (!res.ok) { toast.error('Ошибка при получении данных'); return null; }
    return res.json();
  }

  function getPeriodStr(params: { startDate: string; endDate: string }) {
    return params.startDate && params.endDate
      ? `${params.startDate} — ${params.endDate}`
      : 'Весь период';
  }

  const adminName = `${user.firstName} ${user.lastName}`;

  async function handlePDF(params?: { type: string; startDate: string; endDate: string }) {
    const p = params ?? { type: reportType, startDate, endDate };
    setGenerating(true);
    try {
      const data = await fetchData(p);
      if (!data) return;

      const period = getPeriodStr(p);
      let html = '';
      if (p.type === 'summary') html = buildSummaryHtml(data, period, adminName);
      else if (p.type === 'users') html = buildUsersHtml(data, period, adminName);
      else if (p.type === 'projects') html = buildProjectsHtml(data, period, adminName);

      const win = window.open('', '_blank');
      if (!win) { toast.error('Разрешите всплывающие окна в браузере'); return; }
      win.document.write(html);
      win.document.close();

      if (!params) saveToHistory('pdf', p);
      toast.success('Отчёт открыт — сохраните как PDF через диалог печати');
    } catch {
      toast.error('Ошибка при генерации PDF');
    } finally {
      setGenerating(false);
    }
  }

  async function handleExcel(params?: { type: string; startDate: string; endDate: string }) {
    const p = params ?? { type: reportType, startDate, endDate };
    const fileName = prompt('Введите название файла:', TYPE_LABELS[p.type] ?? 'Отчёт');
    if (!fileName) return;

    setGenerating(true);
    try {
      const data = await fetchData(p);
      if (!data) return;

      const period = getPeriodStr(p);
      if (p.type === 'summary') await exportSummaryExcel(data, period, adminName, fileName);
      else if (p.type === 'users') await exportUsersExcel(data, period, adminName, fileName);
      else if (p.type === 'projects') await exportProjectsExcel(data, period, adminName, fileName);

      if (!params) saveToHistory('excel', p);
      toast.success('Файл Excel скачан');
    } catch {
      toast.error('Ошибка при генерации Excel');
    } finally {
      setGenerating(false);
    }
  }

  function clearHistory() {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }

  return (
    <div className={`transition-all duration-300 ${collapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
      <div className="min-h-screen bg-green-50 pb-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">{tAdmin.reports?.title || 'Отчёты платформы'}</h1>
            <p className="text-sm text-gray-500 mt-1">{tAdmin.reports?.subtitle || 'Генерация PDF и Excel отчётов по данным платформы'}</p>
          </div>

          {/* Report type selector */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">{tAdmin.reports?.reportType || 'Тип отчёта'}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {REPORT_TYPES.map(rt => (
                <button key={rt.id} onClick={() => setReportType(rt.id)}
                  className={`flex flex-col gap-2 p-4 rounded-xl border-2 text-left transition-all ${
                    reportType === rt.id
                      ? 'border-[#00CC00] bg-green-50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${reportType === rt.id ? 'bg-[#00CC00]' : 'bg-gray-100'}`}>
                    <svg className={`w-5 h-5 ${reportType === rt.id ? 'text-white' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={rt.icon} />
                    </svg>
                  </div>
                  <div className={`text-sm font-semibold ${reportType === rt.id ? 'text-[#00CC00]' : 'text-gray-800'}`}>{rt.label}</div>
                  <div className="text-xs text-gray-500 leading-relaxed">{rt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              {tAdmin.reports?.period || 'Период'}
              <span className="ml-2 text-xs font-normal text-gray-400">({tAdmin.reports?.optional || 'необязательно'})</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">{tAdmin.reports?.periodStart || 'Начало периода'}</label>
                <CustomDatePicker value={startDate} onChange={setStartDate} placeholder="Выберите дату" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">{tAdmin.reports?.periodEnd || 'Конец периода'}</label>
                <CustomDatePicker value={endDate} onChange={setEndDate} placeholder="Выберите дату" />
              </div>
            </div>
            {(startDate || endDate) && (
              <button onClick={() => { setStartDate(''); setEndDate(''); }}
                className="mt-3 text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2">
                {tAdmin.reports?.resetDates || 'Сбросить даты'}
              </button>
            )}
          </div>

          {/* Generate buttons */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-2">{tAdmin.reports?.generateReport || 'Сформировать отчёт'}</h2>
            <p className="text-sm text-gray-500 mb-5">
              {TYPE_LABELS[reportType]}
              {(startDate || endDate) && (
                <span className="ml-1 text-gray-400">
                  · {startDate || '…'} — {endDate || '…'}
                </span>
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handlePDF()}
                disabled={generating}
                className="flex items-center justify-center gap-2.5 px-6 py-3 bg-[#00CC00] text-white rounded-xl font-semibold text-sm hover:bg-[#00b300] disabled:opacity-60 transition-colors shadow-sm flex-1 sm:flex-none">
                {generating ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                )}
                Скачать PDF
              </button>
              <button
                onClick={() => handleExcel()}
                disabled={generating}
                className="flex items-center justify-center gap-2.5 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-sm flex-1 sm:flex-none">
                {generating ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M14 3v18" />
                  </svg>
                )}
                Скачать Excel
              </button>
            </div>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">История отчётов</h2>
                <button onClick={clearHistory} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                  Очистить
                </button>
              </div>
              <div className="space-y-2">
                {history.map(entry => (
                  <div key={entry.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${entry.format === 'pdf' ? 'bg-red-50' : 'bg-emerald-50'}`}>
                      {entry.format === 'pdf' ? (
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M14 3v18" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{TYPE_LABELS[entry.type] ?? entry.type}</div>
                      <div className="text-xs text-gray-400">
                        {entry.format.toUpperCase()}
                        {(entry.startDate || entry.endDate) && ` · ${entry.startDate || '…'} — ${entry.endDate || '…'}`}
                        {' · '}{new Date(entry.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => entry.format === 'pdf' ? handlePDF(entry.params) : handleExcel(entry.params)}
                        className="p-2 text-gray-400 hover:text-[#00CC00] hover:bg-green-50 rounded-lg transition-colors"
                        title="Повторить">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function AdminReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me').then(async res => {
      if (!res.ok) { router.push('/admin/login'); return; }
      const data = await res.json();
      if (data.user.role !== 'admin') { router.push('/login'); return; }
      setUser(data.user);
      setLoading(false);
    });
  }, [router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#00CC00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50">
        <AdminSidebar user={user} />
        <AdminNav user={user} />
        <main className="pt-20 lg:pt-24">
          <ReportsContent user={user} />
        </main>
      </div>
    </SidebarProvider>
  );
}
