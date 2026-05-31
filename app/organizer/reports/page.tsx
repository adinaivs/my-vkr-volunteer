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
import { useTranslation } from '@/app/i18n/useTranslation';
import type ExcelJS from 'exceljs';

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
  const { t } = useTranslation('organizer');
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

      const periodStr  = p.startDate && p.endDate ? `${p.startDate} — ${p.endDate}` : 'Все даты';
      const dateNow    = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
      const totalPart  = projects.reduce((s, x) => s + x.totalParticipants, 0);
      const totalTasks = projects.reduce((s, x) => s + x.totalTasks, 0);
      const doneTasks  = projects.reduce((s, x) => s + x.completedTasks, 0);
      const totalVol   = projects.reduce((s, x) => s + x.currentVolunteers, 0);
      const rate       = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

      const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8"/>
  <title>Отчёт по проектам</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4; margin: 20mm 15mm 20mm 20mm; }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 11pt;
      color: #000;
      background: #fff;
      padding: 0;
      line-height: 1.4;
    }

    /* ── Шапка документа ── */
    .doc-annex {
      text-align: right;
      font-size: 9pt;
      font-style: italic;
      margin-bottom: 6px;
    }
    .doc-title {
      text-align: center;
      font-size: 14pt;
      font-weight: bold;
      margin-bottom: 4px;
    }
    .doc-subtitle {
      text-align: center;
      font-size: 11pt;
      font-weight: bold;
      margin-bottom: 4px;
    }
    .doc-type {
      text-align: center;
      font-size: 10pt;
      font-style: italic;
      margin-bottom: 18px;
    }

    /* ── Реквизиты ── */
    .requisites {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
    }
    .requisites td {
      padding: 3px 4px;
      font-size: 10pt;
      vertical-align: bottom;
    }
    .requisites .req-label {
      white-space: nowrap;
      width: 1%;
      padding-right: 8px;
    }
    .requisites .req-value {
      border-bottom: 1px solid #000;
      width: 99%;
    }

    /* ── Разделитель секций ── */
    .section-title {
      background: #e8e8e8;
      font-weight: bold;
      font-size: 10pt;
      text-align: center;
      padding: 5px 8px;
      border: 1px solid #000;
      margin: 14px 0 0 0;
    }

    /* ── Общие таблицы ── */
    table.data {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5pt;
      margin-bottom: 0;
    }
    table.data th {
      background: #e8e8e8;
      font-weight: bold;
      text-align: center;
      padding: 4px 5px;
      border: 1px solid #000;
      vertical-align: middle;
    }
    table.data td {
      padding: 3px 5px;
      border: 1px solid #000;
      vertical-align: middle;
    }
    table.data tr.alt td { background: #f5f5f5; }
    table.data td.num { text-align: center; }
    table.data td.right { text-align: right; }
    table.data tfoot td {
      font-weight: bold;
      background: #e8e8e8;
    }

    /* ── Сводная статистика ── */
    .stat-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 4px;
    }
    .stat-table td {
      border: 1px solid #000;
      padding: 4px 8px;
      font-size: 10pt;
    }
    .stat-table .stat-label {
      background: #f0f0f0;
      font-weight: bold;
      width: 50%;
    }
    .stat-table .stat-value {
      text-align: center;
      width: 50%;
    }

    /* ── Карточка проекта ── */
    .project-block {
      page-break-inside: avoid;
      margin-top: 16px;
    }
    .project-header {
      background: #d8d8d8;
      font-weight: bold;
      font-size: 10.5pt;
      padding: 5px 8px;
      border: 1px solid #000;
      border-bottom: none;
    }
    .project-meta {
      width: 100%;
      border-collapse: collapse;
    }
    .project-meta td {
      border: 1px solid #000;
      padding: 3px 6px;
      font-size: 9.5pt;
    }
    .project-meta .pm-label {
      background: #f5f5f5;
      font-weight: bold;
      width: 35%;
    }

    /* ── Подпись ── */
    .signature-block {
      margin-top: 28px;
      page-break-inside: avoid;
    }
    .signature-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 20px;
      margin-bottom: 4px;
    }
    .sig-label { font-size: 10pt; white-space: nowrap; }
    .sig-line {
      flex: 1;
      border-bottom: 1px solid #000;
      min-width: 160px;
      margin-bottom: 2px;
    }
    .sig-hint {
      text-align: center;
      font-size: 8pt;
      font-style: italic;
      color: #444;
      margin-top: 2px;
    }

    @media print {
      body { padding: 0; }
      .project-block { page-break-inside: avoid; }
    }
  </style>
</head>
<body>

  <!-- Приложение №1 -->
  <div class="doc-annex">Приложение №1</div>

  <!-- Заголовок -->
  <div class="doc-title">Отчёт</div>
  <div class="doc-subtitle">по деятельности волонтёрских проектов организации</div>
  <div class="doc-type">(${TYPE_LABELS[p.type] || p.type})</div>

  <!-- Реквизиты -->
  <table class="requisites">
    <tr>
      <td class="req-label">Наименование организатора</td>
      <td class="req-value">${user?.firstName} ${user?.lastName}</td>
    </tr>
    <tr>
      <td class="req-label">Тип отчёта</td>
      <td class="req-value">${TYPE_LABELS[p.type] || p.type}</td>
    </tr>
    <tr>
      <td class="req-label">Период</td>
      <td class="req-value">${periodStr}</td>
    </tr>
    <tr>
      <td class="req-label">Дата предоставления отчёта</td>
      <td class="req-value">${dateNow}</td>
    </tr>
  </table>

  <!-- Раздел 1: Общая статистика -->
  <div class="section-title">РАЗДЕЛ 1. ОБЩАЯ СТАТИСТИКА</div>
  <table class="stat-table">
    <tr><td class="stat-label">Всего проектов</td><td class="stat-value">${projects.length}</td></tr>
    <tr><td class="stat-label">Волонтёров (текущие)</td><td class="stat-value">${totalVol}</td></tr>
    <tr><td class="stat-label">Участников всего</td><td class="stat-value">${totalPart}</td></tr>
    <tr><td class="stat-label">Задач всего</td><td class="stat-value">${totalTasks}</td></tr>
    <tr><td class="stat-label">Задач выполнено</td><td class="stat-value">${doneTasks}</td></tr>
    <tr><td class="stat-label">Процент выполнения, %</td><td class="stat-value">${rate}</td></tr>
  </table>

  <!-- Раздел 2: Сводная таблица проектов -->
  <div class="section-title">РАЗДЕЛ 2. СВОДНАЯ ТАБЛИЦА ПРОЕКТОВ</div>
  <table class="data">
    <thead>
      <tr>
        <th style="width:4%">№</th>
        <th style="width:26%">Наименование проекта</th>
        <th style="width:13%">Статус</th>
        <th style="width:13%">Категория</th>
        <th style="width:14%">Локация</th>
        <th style="width:13%">Период</th>
        <th style="width:9%">Волонтёры</th>
        <th style="width:8%">Задачи</th>
        <th style="width:8%">Вып., %</th>
      </tr>
    </thead>
    <tbody>
      ${projects.map((proj, i) => `
      <tr${i % 2 === 1 ? ' class="alt"' : ''}>
        <td class="num">${i + 1}</td>
        <td>${proj.title}</td>
        <td>${STATUS_LABELS[proj.status] || proj.status}</td>
        <td>${proj.category}</td>
        <td>${proj.location}</td>
        <td>${proj.startDate}&nbsp;—&nbsp;${proj.endDate}</td>
        <td class="num">${proj.currentVolunteers}&nbsp;/&nbsp;${proj.maxVolunteers}</td>
        <td class="num">${proj.completedTasks}&nbsp;/&nbsp;${proj.totalTasks}</td>
        <td class="num">${proj.completionRate}%</td>
      </tr>`).join('')}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="6" class="right">Итого:</td>
        <td class="num">${totalVol}</td>
        <td class="num">${doneTasks}&nbsp;/&nbsp;${totalTasks}</td>
        <td class="num">${rate}%</td>
      </tr>
    </tfoot>
  </table>

  <!-- Раздел 3: Детали по проектам -->
  <div class="section-title">РАЗДЕЛ 3. ДЕТАЛИ ПО ПРОЕКТАМ</div>

  ${projects.map((proj, i) => `
  <div class="project-block">
    <div class="project-header">${i + 1}. ${proj.title}</div>
    <table class="project-meta">
      <tr>
        <td class="pm-label">Статус</td>
        <td>${STATUS_LABELS[proj.status] || proj.status}</td>
        <td class="pm-label">Категория</td>
        <td>${proj.category}</td>
      </tr>
      <tr>
        <td class="pm-label">Локация</td>
        <td>${proj.location}</td>
        <td class="pm-label">Период</td>
        <td>${proj.startDate} — ${proj.endDate}</td>
      </tr>
      <tr>
        <td class="pm-label">Волонтёры (тек. / макс.)</td>
        <td>${proj.currentVolunteers} / ${proj.maxVolunteers}</td>
        <td class="pm-label">Задачи (вып. / всего)</td>
        <td>${proj.completedTasks} / ${proj.totalTasks} &nbsp;(${proj.completionRate}%)</td>
      </tr>
    </table>

    ${proj.participants.length > 0 ? `
    <table class="data" style="margin-top:0; border-top:none;">
      <thead>
        <tr>
          <th style="width:4%">№</th>
          <th style="width:30%">Имя волонтёра</th>
          <th style="width:32%">Email</th>
          <th style="width:18%">Город</th>
          <th style="width:16%">Дата вступления</th>
        </tr>
      </thead>
      <tbody>
        ${proj.participants.map((part, pi) => `
        <tr${pi % 2 === 1 ? ' class="alt"' : ''}>
          <td class="num">${pi + 1}</td>
          <td>${part.name}</td>
          <td>${part.email}</td>
          <td>${part.city || '—'}</td>
          <td class="num">${part.joinedAt}</td>
        </tr>`).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4" class="right">Итого участников:</td>
          <td class="num">${proj.participants.length}</td>
        </tr>
      </tfoot>
    </table>` : `
    <table class="data" style="margin-top:0; border-top:none;">
      <tbody><tr><td colspan="5" style="text-align:center; font-style:italic; color:#555; padding:6px;">Участников нет</td></tr></tbody>
    </table>`}
  </div>`).join('')}

  <!-- Подпись -->
  <div class="signature-block">
    <div class="signature-row">
      <span class="sig-label">Ответственный организатор:</span>
      <div style="flex:1; display:flex; flex-direction:column; align-items:center;">
        <div class="sig-line"></div>
        <div class="sig-hint">(подпись)</div>
      </div>
      <div style="flex:1; display:flex; flex-direction:column; align-items:center;">
        <div class="sig-line" style="text-align:center; padding-bottom:2px;">${user?.firstName} ${user?.lastName}</div>
        <div class="sig-hint">(Ф.И.О.)</div>
      </div>
    </div>
    <div style="margin-top:12px; font-size:10pt;">
      Дата: <span style="display:inline-block; min-width:120px; border-bottom:1px solid #000;">&nbsp;</span>
    </div>
  </div>

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

    const fileName = prompt('Введите название файла для отчёта:', 'Отчёт по проектам');
    if (!fileName) { toast.error('Название файла не указано'); return; }

    setGenerating(true);
    try {
      const projects = await fetchReportData(p);
      if (!projects) return;
      if (projects.length === 0) { toast.error('Нет данных для отчёта за выбранный период'); return; }

      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = `${user?.firstName} ${user?.lastName}`;
      wb.created = new Date();

      const periodStr   = p.startDate && p.endDate ? `${p.startDate} — ${p.endDate}` : 'Все даты';
      const totalPart   = projects.reduce((s, x) => s + x.totalParticipants, 0);
      const totalTasks  = projects.reduce((s, x) => s + x.totalTasks, 0);
      const doneTasks   = projects.reduce((s, x) => s + x.completedTasks, 0);
      const totalVol    = projects.reduce((s, x) => s + x.currentVolunteers, 0);
      const overallRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
      const dateNow     = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });

      // ─── Хелперы стилей ────────────────────────────────────────────
      const FONT  = 'Times New Roman';
      const BLACK = 'FF000000';
      const WHITE = 'FFFFFFFF';
      const GRAY  = 'FFD9D9D9';
      const LGRAY = 'FFF5F5F5';
      const DGRAY = 'FFB0B0B0';
      const COLS  = 9; // общее число колонок — совпадает с таблицей разделов 2

      const solid = (argb: string): ExcelJS.Fill =>
        ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

      const border = (style: ExcelJS.BorderStyle = 'thin'): Partial<ExcelJS.Borders> => ({
        top:    { style, color: { argb: BLACK } },
        left:   { style, color: { argb: BLACK } },
        bottom: { style, color: { argb: BLACK } },
        right:  { style, color: { argb: BLACK } },
      });

      // Заполнить диапазон ячеек одного ряда рамкой+заливкой (для объединённых ячеек)
      const fillRow = (ws: ExcelJS.Worksheet, row: number, fill: string, bStyle: ExcelJS.BorderStyle = 'thin') => {
        for (let c = 1; c <= COLS; c++) {
          const cell = ws.getCell(row, c);
          cell.fill   = solid(fill);
          cell.border = border(bStyle);
        }
      };

      // Заголовок секции (объединённый, серый)
      const sectionHeader = (ws: ExcelJS.Worksheet, row: number, text: string) => {
        ws.mergeCells(row, 1, row, COLS);
        const c = ws.getCell(row, 1);
        c.value = text;
        c.font  = { name: FONT, bold: true, size: 11 };
        c.fill  = solid(GRAY);
        c.border = border('medium');
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getRow(row).height = 22;
      };

      // ════════════════════════════════════════════════════════════════
      // ЛИСТ 1 — СВОДНЫЙ ОТЧЁТ  (та же структура что и PDF: 3 раздела)
      // ════════════════════════════════════════════════════════════════
      const ws = wb.addWorksheet('Сводный отчёт', {
        pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
        views: [{ state: 'frozen', ySplit: 9 }],
      });

      // Колонки: A(38) B(16) C(16) D(16) E(16) F(16) G(14) H(14) I(10)
      ws.columns = [
        { width: 38 }, { width: 16 }, { width: 16 }, { width: 16 },
        { width: 16 }, { width: 16 }, { width: 14 }, { width: 14 }, { width: 10 },
      ];

      // ── Приложение №1 ─────────────────────────────────────────────
      ws.mergeCells(1, 7, 1, COLS);
      const appCell = ws.getCell(1, 7);
      appCell.value = 'Приложение №1';
      appCell.font  = { name: FONT, size: 9, italic: true };
      appCell.alignment = { horizontal: 'right', vertical: 'middle' };
      ws.getRow(1).height = 16;

      // ── Заголовок (строки 2–4) ────────────────────────────────────
      ws.mergeCells(2, 1, 2, COLS);
      ws.getRow(2).height = 22;
      const hTitle = ws.getCell(2, 1);
      hTitle.value = 'Отчёт';
      hTitle.font  = { name: FONT, bold: true, size: 14 };
      hTitle.alignment = { horizontal: 'center', vertical: 'middle' };

      ws.mergeCells(3, 1, 3, COLS);
      ws.getRow(3).height = 18;
      const hSub = ws.getCell(3, 1);
      hSub.value = 'по деятельности волонтёрских проектов организации';
      hSub.font  = { name: FONT, bold: true, size: 11 };
      hSub.alignment = { horizontal: 'center', vertical: 'middle' };

      ws.mergeCells(4, 1, 4, COLS);
      ws.getRow(4).height = 16;
      const hType = ws.getCell(4, 1);
      hType.value = `(${TYPE_LABELS[p.type] || p.type})`;
      hType.font  = { name: FONT, italic: true, size: 10 };
      hType.alignment = { horizontal: 'center', vertical: 'middle' };

      // ── Реквизиты (строки 5–8) ────────────────────────────────────
      const reqs: [string, string][] = [
        ['Наименование организатора',  `${user?.firstName} ${user?.lastName}`],
        ['Тип отчёта',                 TYPE_LABELS[p.type] || p.type],
        ['Период',                     periodStr],
        ['Дата предоставления отчёта', dateNow],
      ];
      reqs.forEach(([label, val], i) => {
        const rn = 5 + i;
        ws.getRow(rn).height = 18;
        ws.mergeCells(rn, 1, rn, 3);
        const lc = ws.getCell(rn, 1);
        lc.value = label;
        lc.font  = { name: FONT, size: 10 };
        lc.alignment = { horizontal: 'left', vertical: 'middle', wrapText: false };

        ws.mergeCells(rn, 4, rn, COLS);
        const vc = ws.getCell(rn, 4);
        vc.value = val;
        vc.font  = { name: FONT, size: 10 };
        vc.alignment = { horizontal: 'left', vertical: 'middle', wrapText: false };
        vc.border = { bottom: { style: 'thin', color: { argb: BLACK } } };
      });

      ws.getRow(9).height = 8; // пустая строка

      // ════════════════════════════════════════════════════════════════
      // РАЗДЕЛ 1 — ОБЩАЯ СТАТИСТИКА
      // ════════════════════════════════════════════════════════════════
      let r = 10;
      sectionHeader(ws, r++, 'РАЗДЕЛ 1. ОБЩАЯ СТАТИСТИКА');

      // Шапка: Показатель | Значение
      ws.getRow(r).height = 18;
      ws.mergeCells(r, 1, r, COLS - 2);
      const sh1 = ws.getCell(r, 1);
      sh1.value = 'Показатель'; sh1.font = { name: FONT, bold: true, size: 10 };
      sh1.fill = solid(GRAY); sh1.border = border('thin');
      sh1.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.mergeCells(r, COLS - 1, r, COLS);
      const sh2 = ws.getCell(r, COLS - 1);
      sh2.value = 'Значение'; sh2.font = { name: FONT, bold: true, size: 10 };
      sh2.fill = solid(GRAY); sh2.border = border('thin');
      sh2.alignment = { horizontal: 'center', vertical: 'middle' };
      r++;

      const statRows: [string, ExcelJS.CellValue][] = [
        ['Всего проектов',         projects.length],
        ['Волонтёров (текущие)',    totalVol],
        ['Участников всего',        totalPart],
        ['Задач всего',             totalTasks],
        ['Задач выполнено',         doneTasks],
        ['Процент выполнения, %',   overallRate],
      ];
      statRows.forEach(([label, val], ri) => {
        ws.getRow(r).height = 17;
        const bg = ri % 2 === 0 ? WHITE : LGRAY;
        ws.mergeCells(r, 1, r, COLS - 2);
        const lc = ws.getCell(r, 1);
        lc.value = label; lc.font = { name: FONT, size: 10 };
        lc.fill = solid(bg); lc.border = border('thin');
        lc.alignment = { horizontal: 'left', vertical: 'middle' };
        ws.mergeCells(r, COLS - 1, r, COLS);
        const vc = ws.getCell(r, COLS - 1);
        vc.value = val; vc.font = { name: FONT, size: 10 };
        vc.fill = solid(bg); vc.border = border('thin');
        vc.alignment = { horizontal: 'center', vertical: 'middle' };
        r++;
      });

      r++; // пустая строка

      // ════════════════════════════════════════════════════════════════
      // РАЗДЕЛ 2 — СВОДНАЯ ТАБЛИЦА ПРОЕКТОВ
      // ════════════════════════════════════════════════════════════════
      sectionHeader(ws, r++, 'РАЗДЕЛ 2. СВОДНАЯ ТАБЛИЦА ПРОЕКТОВ');

      // Шапка — 9 колонок (те же что в PDF)
      ws.getRow(r).height = 28;
      const projHead = ['№', 'Наименование проекта', 'Статус', 'Категория', 'Локация', 'Период', 'Волонтёры', 'Задачи', 'Вып., %'];
      projHead.forEach((h, ci) => {
        const c = ws.getCell(r, ci + 1);
        c.value = h; c.font = { name: FONT, bold: true, size: 10 };
        c.fill = solid(GRAY); c.border = border('thin');
        c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      });
      r++;

      projects.forEach((proj, pi) => {
        ws.getRow(r).height = 18;
        const bg = pi % 2 === 0 ? WHITE : LGRAY;
        const vals: ExcelJS.CellValue[] = [
          pi + 1, proj.title,
          STATUS_LABELS[proj.status] || proj.status,
          proj.category, proj.location,
          `${proj.startDate} — ${proj.endDate}`,
          `${proj.currentVolunteers} / ${proj.maxVolunteers}`,
          `${proj.completedTasks} / ${proj.totalTasks}`,
          `${proj.completionRate}%`,
        ];
        vals.forEach((v, ci) => {
          const c = ws.getCell(r, ci + 1);
          c.value = v; c.font = { name: FONT, size: 10 };
          c.fill = solid(bg); c.border = border('thin');
          c.alignment = { horizontal: ci === 0 ? 'center' : 'left', vertical: 'middle', wrapText: ci === 1 };
        });
        r++;
      });

      // Итоговая строка
      ws.getRow(r).height = 18;
      ws.mergeCells(r, 1, r, 6);
      const tot1 = ws.getCell(r, 1);
      tot1.value = 'Итого:'; tot1.font = { name: FONT, bold: true, size: 10 };
      tot1.fill = solid(GRAY); tot1.border = border('thin');
      tot1.alignment = { horizontal: 'right', vertical: 'middle' };
      [[7, `${totalVol}`], [8, `${doneTasks} / ${totalTasks}`], [9, `${overallRate}%`]].forEach(([col, val]) => {
        const c = ws.getCell(r, col as number);
        c.value = val; c.font = { name: FONT, bold: true, size: 10 };
        c.fill = solid(GRAY); c.border = border('thin');
        c.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      r += 2;

      // ════════════════════════════════════════════════════════════════
      // РАЗДЕЛ 3 — ДЕТАЛИ ПО ПРОЕКТАМ (идентично PDF)
      // ════════════════════════════════════════════════════════════════
      sectionHeader(ws, r++, 'РАЗДЕЛ 3. ДЕТАЛИ ПО ПРОЕКТАМ');

      projects.forEach((proj, pi) => {
        // Заголовок проекта
        ws.mergeCells(r, 1, r, COLS);
        const ph = ws.getCell(r, 1);
        ph.value = `${pi + 1}. ${proj.title}`;
        ph.font  = { name: FONT, bold: true, size: 11 };
        ph.fill  = solid(DGRAY); ph.border = border('thin');
        ph.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
        ws.getRow(r).height = 22;
        r++;

        // Мета-данные: 2 пары в ряд (как в PDF)
        const meta: [string, string, string, string][] = [
          ['Статус',                   STATUS_LABELS[proj.status] || proj.status,
           'Категория',                proj.category],
          ['Локация',                  proj.location,
           'Период',                   `${proj.startDate} — ${proj.endDate}`],
          ['Волонтёры (тек. / макс.)', `${proj.currentVolunteers} / ${proj.maxVolunteers}`,
           'Задачи (вып. / всего)',    `${proj.completedTasks} / ${proj.totalTasks} (${proj.completionRate}%)`],
        ];
        meta.forEach(([l1, v1, l2, v2], mi) => {
          ws.getRow(r).height = 17;
          const bg = mi % 2 === 0 ? LGRAY : WHITE;
          // Левая пара: A-B = метка, C-D-E = значение
          ws.mergeCells(r, 1, r, 2);
          const lc1 = ws.getCell(r, 1);
          lc1.value = l1; lc1.font = { name: FONT, bold: true, size: 10 };
          lc1.fill = solid(bg); lc1.border = border('thin');
          lc1.alignment = { horizontal: 'right', vertical: 'middle' };
          ws.mergeCells(r, 3, r, 5);
          const vc1 = ws.getCell(r, 3);
          vc1.value = v1; vc1.font = { name: FONT, size: 10 };
          vc1.fill = solid(bg); vc1.border = border('thin');
          vc1.alignment = { horizontal: 'left', vertical: 'middle' };
          // Правая пара: F-G = метка, H-I = значение
          ws.mergeCells(r, 6, r, 7);
          const lc2 = ws.getCell(r, 6);
          lc2.value = l2; lc2.font = { name: FONT, bold: true, size: 10 };
          lc2.fill = solid(bg); lc2.border = border('thin');
          lc2.alignment = { horizontal: 'right', vertical: 'middle' };
          ws.mergeCells(r, 8, r, COLS);
          const vc2 = ws.getCell(r, 8);
          vc2.value = v2; vc2.font = { name: FONT, size: 10 };
          vc2.fill = solid(bg); vc2.border = border('thin');
          vc2.alignment = { horizontal: 'left', vertical: 'middle' };
          r++;
        });

        // Таблица участников
        if (proj.participants.length > 0) {
          ws.getRow(r).height = 18;
          const partHead = ['№', 'Имя волонтёра', '', 'Email', '', 'Город', '', 'Дата вступления', ''];
          partHead.forEach((h, ci) => {
            const c = ws.getCell(r, ci + 1);
            c.fill = solid(GRAY); c.border = border('thin');
            c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          });
          // Объединяем столбцы шапки участников (аналог PDF cols)
          ws.mergeCells(r, 2, r, 3); ws.getCell(r, 2).value = 'Имя волонтёра';
          ws.getCell(r, 2).font = { name: FONT, bold: true, size: 10 };
          ws.getCell(r, 2).fill = solid(GRAY); ws.getCell(r, 2).border = border('thin');
          ws.getCell(r, 2).alignment = { horizontal: 'center', vertical: 'middle' };
          ws.mergeCells(r, 4, r, 5); ws.getCell(r, 4).value = 'Email';
          ws.getCell(r, 4).font = { name: FONT, bold: true, size: 10 };
          ws.getCell(r, 4).fill = solid(GRAY); ws.getCell(r, 4).border = border('thin');
          ws.getCell(r, 4).alignment = { horizontal: 'center', vertical: 'middle' };
          ws.mergeCells(r, 6, r, 7); ws.getCell(r, 6).value = 'Город';
          ws.getCell(r, 6).font = { name: FONT, bold: true, size: 10 };
          ws.getCell(r, 6).fill = solid(GRAY); ws.getCell(r, 6).border = border('thin');
          ws.getCell(r, 6).alignment = { horizontal: 'center', vertical: 'middle' };
          ws.mergeCells(r, 8, r, COLS); ws.getCell(r, 8).value = 'Дата вступления';
          ws.getCell(r, 8).font = { name: FONT, bold: true, size: 10 };
          ws.getCell(r, 8).fill = solid(GRAY); ws.getCell(r, 8).border = border('thin');
          ws.getCell(r, 8).alignment = { horizontal: 'center', vertical: 'middle' };
          const numC = ws.getCell(r, 1);
          numC.value = '№'; numC.font = { name: FONT, bold: true, size: 10 };
          numC.fill = solid(GRAY); numC.border = border('thin');
          numC.alignment = { horizontal: 'center', vertical: 'middle' };
          r++;

          proj.participants.forEach((part, idx) => {
            ws.getRow(r).height = 16;
            const bg = idx % 2 === 0 ? WHITE : LGRAY;
            // №
            const nc = ws.getCell(r, 1);
            nc.value = idx + 1; nc.font = { name: FONT, size: 10 };
            nc.fill = solid(bg); nc.border = border('thin');
            nc.alignment = { horizontal: 'center', vertical: 'middle' };
            // Имя
            ws.mergeCells(r, 2, r, 3);
            const nm = ws.getCell(r, 2);
            nm.value = part.name; nm.font = { name: FONT, size: 10 };
            nm.fill = solid(bg); nm.border = border('thin');
            nm.alignment = { horizontal: 'left', vertical: 'middle' };
            // Email
            ws.mergeCells(r, 4, r, 5);
            const em = ws.getCell(r, 4);
            em.value = part.email; em.font = { name: FONT, size: 10 };
            em.fill = solid(bg); em.border = border('thin');
            em.alignment = { horizontal: 'left', vertical: 'middle' };
            // Город
            ws.mergeCells(r, 6, r, 7);
            const ct = ws.getCell(r, 6);
            ct.value = part.city || '—'; ct.font = { name: FONT, size: 10 };
            ct.fill = solid(bg); ct.border = border('thin');
            ct.alignment = { horizontal: 'left', vertical: 'middle' };
            // Дата
            ws.mergeCells(r, 8, r, COLS);
            const dt = ws.getCell(r, 8);
            dt.value = part.joinedAt; dt.font = { name: FONT, size: 10 };
            dt.fill = solid(bg); dt.border = border('thin');
            dt.alignment = { horizontal: 'center', vertical: 'middle' };
            r++;
          });

          // Итого участников
          ws.getRow(r).height = 17;
          ws.mergeCells(r, 1, r, COLS - 2);
          const itL = ws.getCell(r, 1);
          itL.value = 'Итого участников:'; itL.font = { name: FONT, bold: true, size: 10 };
          itL.fill = solid(GRAY); itL.border = border('thin');
          itL.alignment = { horizontal: 'right', vertical: 'middle' };
          ws.mergeCells(r, COLS - 1, r, COLS);
          const itV = ws.getCell(r, COLS - 1);
          itV.value = proj.participants.length; itV.font = { name: FONT, bold: true, size: 10 };
          itV.fill = solid(GRAY); itV.border = border('thin');
          itV.alignment = { horizontal: 'center', vertical: 'middle' };
          r++;
        } else {
          ws.mergeCells(r, 1, r, COLS);
          const emp = ws.getCell(r, 1);
          emp.value = 'Участников нет';
          emp.font  = { name: FONT, italic: true, size: 10 };
          emp.border = border('thin');
          emp.alignment = { horizontal: 'center', vertical: 'middle' };
          ws.getRow(r).height = 16;
          r++;
        }

        r++; // отступ между проектами
      });

      // ── Подпись ───────────────────────────────────────────────────
      r++;
      ws.mergeCells(r, 1, r, 4);
      const sigL = ws.getCell(r, 1);
      sigL.value = 'Ответственный организатор:';
      sigL.font  = { name: FONT, size: 10 };
      ws.getRow(r).height = 20;

      ws.mergeCells(r, 5, r, COLS);
      const sigV = ws.getCell(r, 5);
      sigV.value = `${user?.firstName} ${user?.lastName}`;
      sigV.font  = { name: FONT, size: 10 };
      sigV.border = { bottom: { style: 'thin', color: { argb: BLACK } } };
      sigV.alignment = { horizontal: 'center', vertical: 'bottom' };

      r++;
      ws.mergeCells(r, 5, r, COLS);
      const sigH = ws.getCell(r, 5);
      sigH.value = '(подпись / Ф.И.О.)';
      sigH.font  = { name: FONT, size: 8, italic: true };
      sigH.alignment = { horizontal: 'center', vertical: 'top' };
      ws.getRow(r).height = 14;

      r += 2;
      ws.mergeCells(r, 1, r, 3);
      const dateL = ws.getCell(r, 1);
      dateL.value = 'Дата:';
      dateL.font  = { name: FONT, size: 10 };

      ws.mergeCells(r, 4, r, 6);
      const dateV = ws.getCell(r, 4);
      dateV.border = { bottom: { style: 'thin', color: { argb: BLACK } } };

      // ════════════════════════════════════════════════════════════════
      // Скачивание
      // ════════════════════════════════════════════════════════════════
      const buffer = await wb.xlsx.writeBuffer();
      const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url    = URL.createObjectURL(blob);
      const a      = document.createElement('a');
      a.href     = url;
      a.download = `${fileName.replace(/[^\wа-яА-ЯёЁ\s\-_]/g, '')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

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
          <div className="mb-4 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{t.reports?.title || 'Отчёты'}</h1>
            <p className="hidden sm:block text-gray-600">{t.reports?.subtitle || 'Создавайте и скачивайте отчёты по вашим проектам'}</p>
          </div>

          {/* Генератор отчёта */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-8 mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">{t.reports?.generateReport || 'Создать отчёт'}</h2>

            <div className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-3">{t.reports?.reportType || 'Тип отчёта'}</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
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
                <label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                  {t.reports?.period || 'Период'} <span className="text-gray-400 font-normal">({t.reports?.optional || 'необязательно'})</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-2">{t.reports?.periodStart || 'Дата начала'}</label>
                    <CustomDatePicker value={startDate} onChange={setStartDate} placeholder="Выберите дату начала" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-2">{t.reports?.periodEnd || 'Дата окончания'}</label>
                    <CustomDatePicker value={endDate} onChange={setEndDate} placeholder="Выберите дату окончания" minDate={startDate} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-3">{t.reports?.generateReport || 'Формат отчёта'}</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <button
                    onClick={() => handleGeneratePDF()}
                    disabled={generating}
                    className="flex items-center justify-center gap-3 px-4 sm:px-6 py-3 sm:py-4 bg-red-50 border-2 border-red-200 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-gray-900">{t.reports?.downloadPdf || 'Скачать PDF'}</div>
                      <div className="text-sm text-gray-600">Откроется страница для печати</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleGenerateExcel()}
                    disabled={generating}
                    className="flex items-center justify-center gap-3 px-4 sm:px-6 py-3 sm:py-4 bg-green-50 border-2 border-green-200 rounded-xl hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-gray-900">{t.reports?.downloadExcel || 'Скачать Excel'}</div>
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
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-8">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">{t.reports?.history || 'История отчётов'}</h2>
              {history.length > 0 && (
                <button
                  onClick={() => {
                    setHistory([]);
                    localStorage.removeItem(HISTORY_KEY);
                  }}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  {t.reports?.clearHistory || 'Очистить'}
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
                <p className="text-gray-500 text-sm">{t.common?.noData || 'Созданные отчёты будут отображаться здесь'}</p>
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
