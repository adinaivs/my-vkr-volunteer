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
import { Tooltip } from '@/app/components/Tooltip';
import type ExcelJS from 'exceljs';

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

// ─── Общий CSS для официальных PDF ───────────────────────────────────────────
const OFFICIAL_CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  @page{size:A4;margin:20mm 15mm 20mm 20mm}
  body{font-family:"Times New Roman",Times,serif;font-size:11pt;color:#000;background:#fff;line-height:1.4}
  .doc-annex{text-align:right;font-size:9pt;font-style:italic;margin-bottom:6px}
  .doc-title{text-align:center;font-size:14pt;font-weight:bold;margin-bottom:4px}
  .doc-subtitle{text-align:center;font-size:11pt;font-weight:bold;margin-bottom:4px}
  .doc-type{text-align:center;font-size:10pt;font-style:italic;margin-bottom:18px}
  .requisites{width:100%;border-collapse:collapse;margin-bottom:14px}
  .requisites td{padding:3px 4px;font-size:10pt;vertical-align:bottom}
  .req-label{white-space:nowrap;width:1%;padding-right:8px}
  .req-value{border-bottom:1px solid #000;width:99%}
  .section-title{background:#e8e8e8;font-weight:bold;font-size:10pt;text-align:center;padding:5px 8px;border:1px solid #000;margin:14px 0 0}
  table.data{width:100%;border-collapse:collapse;font-size:9.5pt;margin-bottom:0}
  table.data th{background:#e8e8e8;font-weight:bold;text-align:center;padding:4px 5px;border:1px solid #000;vertical-align:middle}
  table.data td{padding:3px 5px;border:1px solid #000;vertical-align:middle}
  table.data tr.alt td{background:#f5f5f5}
  table.data td.num{text-align:center}
  table.data tfoot td{font-weight:bold;background:#e8e8e8}
  .stat-table{width:100%;border-collapse:collapse;margin-bottom:4px}
  .stat-table td{border:1px solid #000;padding:4px 8px;font-size:10pt}
  .stat-label{background:#f0f0f0;font-weight:bold;width:60%}
  .stat-value{text-align:center;width:40%}
  .signature-block{margin-top:28px;page-break-inside:avoid}
  .signature-row{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:4px}
  .sig-label{font-size:10pt;white-space:nowrap}
  .sig-line{flex:1;border-bottom:1px solid #000;min-width:160px;margin-bottom:2px}
  .sig-hint{text-align:center;font-size:8pt;font-style:italic;color:#444;margin-top:2px}
  @media print{body{padding:0}.project-block{page-break-inside:avoid}}
`;

// ─── HTML generators ──────────────────────────────────────────────────────────

function buildSummaryHtml(data: any, period: string, adminName: string): string {
  const t = data.totals;
  const now = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
  const taskRate = t.totalTasks > 0 ? Math.round((t.completedTasks / t.totalTasks) * 100) : 0;

  const statusRows = data.projectsByStatus
    .sort((a: any, b: any) => b.count - a.count)
    .map((s: any, i: number) => `<tr${i % 2 ? ' class="alt"' : ''}><td>${STATUS_LABELS[s.status] ?? s.status}</td><td class="num">${s.count}</td></tr>`)
    .join('');

  const catRows = data.categories.map((c: any, i: number) =>
    `<tr${i % 2 ? ' class="alt"' : ''}><td>${c.name}</td><td class="num">${c.count}</td></tr>`).join('');

  const monthRegRows = data.monthlyRegistrations.map((m: any, i: number) =>
    `<tr${i % 2 ? ' class="alt"' : ''}><td>${m.label}</td><td class="num">${m.count}</td></tr>`).join('');

  const monthProjRows = data.monthlyProjects.map((m: any, i: number) =>
    `<tr${i % 2 ? ' class="alt"' : ''}><td>${m.label}</td><td class="num">${m.count}</td></tr>`).join('');

  const topVolRows = data.topVolunteers.map((v: any, i: number) =>
    `<tr${i % 2 ? ' class="alt"' : ''}><td class="num">${i+1}</td><td>${v.name}</td><td>${v.email}</td><td>${v.city ?? '—'}</td><td class="num">${v.completedTasks}</td><td class="num">${v.trustScore}</td></tr>`).join('');

  const topOrgRows = data.topOrganizers.map((o: any, i: number) =>
    `<tr${i % 2 ? ' class="alt"' : ''}><td class="num">${i+1}</td><td>${o.name}</td><td>${o.organizationName}</td><td>${o.city ?? '—'}</td><td class="num">${o.projectsCount}</td></tr>`).join('');

  return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"/>
<title>Сводный отчёт платформы</title>
<style>${OFFICIAL_CSS}</style></head><body>
<div class="doc-annex">Приложение №1</div>
<div class="doc-title">Сводный отчёт</div>
<div class="doc-subtitle">о деятельности платформы ВолонтёрКР</div>
<div class="doc-type">(административный отчёт)</div>
<table class="requisites">
  <tr><td class="req-label">Администратор</td><td class="req-value">${adminName}</td></tr>
  <tr><td class="req-label">Период</td><td class="req-value">${period}</td></tr>
  <tr><td class="req-label">Дата предоставления отчёта</td><td class="req-value">${now}</td></tr>
</table>

<div class="section-title">РАЗДЕЛ 1. ОБЩАЯ СТАТИСТИКА</div>
<table class="stat-table">
  <tr><td class="stat-label">Всего пользователей</td><td class="stat-value">${t.totalUsers}</td></tr>
  <tr><td class="stat-label">Волонтёров</td><td class="stat-value">${t.totalVolunteers}</td></tr>
  <tr><td class="stat-label">Организаторов</td><td class="stat-value">${t.totalOrganizers}</td></tr>
  <tr><td class="stat-label">Всего проектов</td><td class="stat-value">${t.totalProjects}</td></tr>
  <tr><td class="stat-label">Активных проектов</td><td class="stat-value">${t.activeProjects}</td></tr>
  <tr><td class="stat-label">Завершённых проектов</td><td class="stat-value">${t.completedProjects}</td></tr>
  <tr><td class="stat-label">Всего задач</td><td class="stat-value">${t.totalTasks}</td></tr>
  <tr><td class="stat-label">Задач выполнено</td><td class="stat-value">${t.completedTasks}</td></tr>
  <tr><td class="stat-label">Процент выполнения задач, %</td><td class="stat-value">${taskRate}</td></tr>
</table>

<div class="section-title">РАЗДЕЛ 2. ПРОЕКТЫ ПО СТАТУСАМ И КАТЕГОРИЯМ</div>
<table class="data" style="margin-top:0">
  <thead><tr><th style="width:50%">Статус</th><th style="width:50%">Количество</th></tr></thead>
  <tbody>${statusRows || '<tr><td colspan="2" style="text-align:center;font-style:italic">Нет данных</td></tr>'}</tbody>
</table>
<table class="data" style="margin-top:0;border-top:none">
  <thead><tr><th style="width:50%">Категория</th><th style="width:50%">Проектов</th></tr></thead>
  <tbody>${catRows || '<tr><td colspan="2" style="text-align:center;font-style:italic">Нет данных</td></tr>'}</tbody>
</table>

<div class="section-title">РАЗДЕЛ 3. ДИНАМИКА ЗА 6 МЕСЯЦЕВ</div>
<table class="data" style="margin-top:0">
  <thead><tr><th style="width:40%">Месяц</th><th style="width:30%">Регистраций</th><th style="width:30%">Проектов</th></tr></thead>
  <tbody>
    ${data.monthlyRegistrations.map((m: any, i: number) => {
      const mp = data.monthlyProjects[i];
      return `<tr${i % 2 ? ' class="alt"' : ''}><td>${m.label}</td><td class="num">${m.count}</td><td class="num">${mp?.count ?? 0}</td></tr>`;
    }).join('')}
  </tbody>
</table>

<div class="section-title">РАЗДЕЛ 4. ТОП-10 ВОЛОНТЁРОВ (по выполненным задачам)</div>
<table class="data" style="margin-top:0">
  <thead><tr><th style="width:4%">#</th><th style="width:22%">Имя</th><th style="width:28%">Email</th><th style="width:14%">Город</th><th style="width:16%">Задач выполнено</th><th style="width:16%">Рейтинг</th></tr></thead>
  <tbody>${topVolRows || '<tr><td colspan="6" style="text-align:center;font-style:italic">Нет данных</td></tr>'}</tbody>
</table>

<div class="section-title">РАЗДЕЛ 5. ТОП-10 ОРГАНИЗАТОРОВ (по количеству проектов)</div>
<table class="data" style="margin-top:0">
  <thead><tr><th style="width:4%">#</th><th style="width:22%">Имя</th><th style="width:30%">Организация</th><th style="width:20%">Город</th><th style="width:24%">Проектов</th></tr></thead>
  <tbody>${topOrgRows || '<tr><td colspan="5" style="text-align:center;font-style:italic">Нет данных</td></tr>'}</tbody>
</table>

<div class="signature-block">
  <div class="signature-row">
    <span class="sig-label">Администратор:</span>
    <div style="flex:1;display:flex;flex-direction:column;align-items:center">
      <div class="sig-line"></div><div class="sig-hint">(подпись)</div>
    </div>
    <div style="flex:1;display:flex;flex-direction:column;align-items:center">
      <div class="sig-line" style="text-align:center;padding-bottom:2px">${adminName}</div>
      <div class="sig-hint">(Ф.И.О.)</div>
    </div>
  </div>
  <div style="margin-top:12px;font-size:10pt">Дата: <span style="display:inline-block;min-width:120px;border-bottom:1px solid #000">&nbsp;</span></div>
</div>
<script>window.onload=()=>{window.print()}</script>
</body></html>`;
}

function buildUsersHtml(data: any, period: string, adminName: string): string {
  const now = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
  const volunteers = data.users.filter((u: any) => u.role === 'volunteer');
  const organizers = data.users.filter((u: any) => u.role === 'organizer');

  const volRows = volunteers.map((u: any, i: number) =>
    `<tr${i % 2 ? ' class="alt"' : ''}><td class="num">${i+1}</td><td>${u.name}</td><td>${u.email}</td><td>${u.city ?? '—'}</td><td class="num">${u.completedTasks ?? 0}</td><td class="num">${u.completedProjects ?? 0}</td><td class="num">${u.trustScore ?? '0.0'}</td><td>${USER_STATUS_LABELS[u.status] ?? u.status}</td><td class="num">${u.registeredAt}</td></tr>`).join('');

  const orgRows = organizers.map((u: any, i: number) =>
    `<tr${i % 2 ? ' class="alt"' : ''}><td class="num">${i+1}</td><td>${u.name}</td><td>${u.email}</td><td>${u.organizationName ?? '—'}</td><td>${u.city ?? '—'}</td><td>${u.verificationStatus === 'verified' ? 'Верифицирован' : u.verificationStatus === 'pending' ? 'На проверке' : 'Не верифицирован'}</td><td>${USER_STATUS_LABELS[u.status] ?? u.status}</td><td class="num">${u.registeredAt}</td></tr>`).join('');

  return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"/>
<title>Отчёт по пользователям</title>
<style>${OFFICIAL_CSS}</style></head><body>
<div class="doc-annex">Приложение №1</div>
<div class="doc-title">Отчёт по пользователям</div>
<div class="doc-subtitle">платформы ВолонтёрКР</div>
<table class="requisites">
  <tr><td class="req-label">Администратор</td><td class="req-value">${adminName}</td></tr>
  <tr><td class="req-label">Период</td><td class="req-value">${period}</td></tr>
  <tr><td class="req-label">Дата предоставления отчёта</td><td class="req-value">${now}</td></tr>
</table>

<div class="section-title">РАЗДЕЛ 1. ОБЩАЯ СТАТИСТИКА</div>
<table class="stat-table">
  <tr><td class="stat-label">Всего пользователей</td><td class="stat-value">${data.users.length}</td></tr>
  <tr><td class="stat-label">Волонтёров</td><td class="stat-value">${volunteers.length}</td></tr>
  <tr><td class="stat-label">Организаторов</td><td class="stat-value">${organizers.length}</td></tr>
</table>

<div class="section-title">РАЗДЕЛ 2. ВОЛОНТЁРЫ (${volunteers.length})</div>
<table class="data" style="margin-top:0">
  <thead><tr><th style="width:3%">#</th><th style="width:18%">Имя</th><th style="width:22%">Email</th><th style="width:10%">Город</th><th style="width:8%">Задач</th><th style="width:9%">Проектов</th><th style="width:8%">Рейтинг</th><th style="width:10%">Статус</th><th style="width:12%">Дата рег.</th></tr></thead>
  <tbody>${volRows || '<tr><td colspan="9" style="text-align:center;font-style:italic;padding:6px">Нет данных</td></tr>'}</tbody>
  <tfoot><tr><td colspan="8" style="text-align:right">Итого волонтёров:</td><td class="num">${volunteers.length}</td></tr></tfoot>
</table>

<div class="section-title">РАЗДЕЛ 3. ОРГАНИЗАТОРЫ (${organizers.length})</div>
<table class="data" style="margin-top:0">
  <thead><tr><th style="width:3%">#</th><th style="width:18%">Имя</th><th style="width:22%">Email</th><th style="width:20%">Организация</th><th style="width:10%">Город</th><th style="width:13%">Верификация</th><th style="width:8%">Статус</th><th style="width:12%">Дата рег.</th></tr></thead>
  <tbody>${orgRows || '<tr><td colspan="8" style="text-align:center;font-style:italic;padding:6px">Нет данных</td></tr>'}</tbody>
  <tfoot><tr><td colspan="7" style="text-align:right">Итого организаторов:</td><td class="num">${organizers.length}</td></tr></tfoot>
</table>

<div class="signature-block">
  <div class="signature-row">
    <span class="sig-label">Администратор:</span>
    <div style="flex:1;display:flex;flex-direction:column;align-items:center">
      <div class="sig-line"></div><div class="sig-hint">(подпись)</div>
    </div>
    <div style="flex:1;display:flex;flex-direction:column;align-items:center">
      <div class="sig-line" style="text-align:center;padding-bottom:2px">${adminName}</div>
      <div class="sig-hint">(Ф.И.О.)</div>
    </div>
  </div>
  <div style="margin-top:12px;font-size:10pt">Дата: <span style="display:inline-block;min-width:120px;border-bottom:1px solid #000">&nbsp;</span></div>
</div>
<script>window.onload=()=>{window.print()}</script>
</body></html>`;
}

function buildProjectsHtml(data: any, period: string, adminName: string): string {
  const now = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
  const projects = data.projects;
  const totalTasks = projects.reduce((s: number, p: any) => s + p.totalTasks, 0);
  const doneTasks  = projects.reduce((s: number, p: any) => s + p.completedTasks, 0);
  const totalPart  = projects.reduce((s: number, p: any) => s + p.participantsCount, 0);
  const rate       = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const rows = projects.map((p: any, i: number) =>
    `<tr${i % 2 ? ' class="alt"' : ''}><td class="num">${i+1}</td><td>${p.title}</td><td>${STATUS_LABELS[p.status] ?? p.status}</td><td>${p.category}</td><td>${p.organizationName}</td><td>${p.location}</td><td class="num">${p.currentVolunteers}/${p.maxVolunteers}</td><td class="num">${p.participantsCount}</td><td class="num">${p.completedTasks}/${p.totalTasks}</td><td class="num">${p.startDate} — ${p.endDate}</td></tr>`).join('');

  return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"/>
<title>Отчёт по проектам</title>
<style>${OFFICIAL_CSS}</style></head><body>
<div class="doc-annex">Приложение №1</div>
<div class="doc-title">Отчёт по проектам</div>
<div class="doc-subtitle">платформы ВолонтёрКР</div>
<table class="requisites">
  <tr><td class="req-label">Администратор</td><td class="req-value">${adminName}</td></tr>
  <tr><td class="req-label">Период</td><td class="req-value">${period}</td></tr>
  <tr><td class="req-label">Дата предоставления отчёта</td><td class="req-value">${now}</td></tr>
</table>

<div class="section-title">РАЗДЕЛ 1. ОБЩАЯ СТАТИСТИКА</div>
<table class="stat-table">
  <tr><td class="stat-label">Всего проектов</td><td class="stat-value">${projects.length}</td></tr>
  <tr><td class="stat-label">Всего участников</td><td class="stat-value">${totalPart}</td></tr>
  <tr><td class="stat-label">Всего задач</td><td class="stat-value">${totalTasks}</td></tr>
  <tr><td class="stat-label">Задач выполнено</td><td class="stat-value">${doneTasks}</td></tr>
  <tr><td class="stat-label">Процент выполнения, %</td><td class="stat-value">${rate}</td></tr>
</table>

<div class="section-title">РАЗДЕЛ 2. СВОДНАЯ ТАБЛИЦА ПРОЕКТОВ</div>
<table class="data" style="margin-top:0">
  <thead><tr>
    <th style="width:3%">#</th><th style="width:20%">Название</th><th style="width:10%">Статус</th>
    <th style="width:10%">Категория</th><th style="width:14%">Организация</th><th style="width:10%">Локация</th>
    <th style="width:8%">Волонтёры</th><th style="width:7%">Участников</th><th style="width:8%">Задачи</th><th style="width:10%">Период</th>
  </tr></thead>
  <tbody>${rows || '<tr><td colspan="10" style="text-align:center;font-style:italic;padding:6px">Нет данных</td></tr>'}</tbody>
  <tfoot>
    <tr><td colspan="7" style="text-align:right">Итого:</td><td class="num">${totalPart}</td><td class="num">${doneTasks}/${totalTasks}</td><td class="num">${rate}%</td></tr>
  </tfoot>
</table>

<div class="signature-block">
  <div class="signature-row">
    <span class="sig-label">Администратор:</span>
    <div style="flex:1;display:flex;flex-direction:column;align-items:center">
      <div class="sig-line"></div><div class="sig-hint">(подпись)</div>
    </div>
    <div style="flex:1;display:flex;flex-direction:column;align-items:center">
      <div class="sig-line" style="text-align:center;padding-bottom:2px">${adminName}</div>
      <div class="sig-hint">(Ф.И.О.)</div>
    </div>
  </div>
  <div style="margin-top:12px;font-size:10pt">Дата: <span style="display:inline-block;min-width:120px;border-bottom:1px solid #000">&nbsp;</span></div>
</div>
<script>window.onload=()=>{window.print()}</script>
</body></html>`;
}

// ─── Excel helpers ────────────────────────────────────────────────────────────

function makeExcelHelpers(ExcelJS: any) {
  const FONT  = 'Times New Roman';
  const BLACK = 'FF000000';
  const WHITE = 'FFFFFFFF';
  const GRAY  = 'FFD9D9D9';
  const LGRAY = 'FFF5F5F5';

  const solid = (argb: string): ExcelJS.Fill =>
    ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

  const border = (style: ExcelJS.BorderStyle = 'thin'): Partial<ExcelJS.Borders> => ({
    top: { style, color: { argb: BLACK } }, left: { style, color: { argb: BLACK } },
    bottom: { style, color: { argb: BLACK } }, right: { style, color: { argb: BLACK } },
  });

  const secHeader = (ws: ExcelJS.Worksheet, row: number, text: string, cols: number) => {
    ws.mergeCells(row, 1, row, cols);
    const c = ws.getCell(row, 1);
    c.value = text; c.font = { name: FONT, bold: true, size: 11 };
    c.fill = solid(GRAY); c.border = border('medium');
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(row).height = 22;
  };

  const docHeader = (ws: ExcelJS.Worksheet, title: string, subtitle: string, reqs: [string,string][], cols: number) => {
    // Приложение №1
    ws.mergeCells(1, Math.max(1, cols - 1), 1, cols);
    const ap = ws.getCell(1, Math.max(1, cols - 1));
    ap.value = 'Приложение №1'; ap.font = { name: FONT, size: 9, italic: true };
    ap.alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getRow(1).height = 16;
    // Заголовок
    ws.mergeCells(2, 1, 2, cols); ws.getRow(2).height = 22;
    const t = ws.getCell(2, 1);
    t.value = title; t.font = { name: FONT, bold: true, size: 14 };
    t.alignment = { horizontal: 'center', vertical: 'middle' };
    // Подзаголовок
    ws.mergeCells(3, 1, 3, cols); ws.getRow(3).height = 16;
    const s = ws.getCell(3, 1);
    s.value = subtitle; s.font = { name: FONT, bold: true, size: 11 };
    s.alignment = { horizontal: 'center', vertical: 'middle' };
    // Реквизиты
    reqs.forEach(([label, val], i) => {
      const rn = 4 + i;
      ws.getRow(rn).height = 18;
      ws.mergeCells(rn, 1, rn, Math.ceil(cols / 3));
      const lc = ws.getCell(rn, 1);
      lc.value = label; lc.font = { name: FONT, size: 10 };
      lc.alignment = { horizontal: 'left', vertical: 'middle', wrapText: false };
      ws.mergeCells(rn, Math.ceil(cols / 3) + 1, rn, cols);
      const vc = ws.getCell(rn, Math.ceil(cols / 3) + 1);
      vc.value = val; vc.font = { name: FONT, size: 10 };
      vc.border = { bottom: { style: 'thin', color: { argb: BLACK } } };
      vc.alignment = { horizontal: 'left', vertical: 'middle', wrapText: false };
    });
    ws.getRow(4 + reqs.length).height = 8;
    return 5 + reqs.length; // следующая строка
  };

  const tableHead = (ws: ExcelJS.Worksheet, row: number, headers: string[], widths?: number[]) => {
    ws.getRow(row).height = 24;
    headers.forEach((h, ci) => {
      const c = ws.getCell(row, ci + 1);
      c.value = h; c.font = { name: FONT, bold: true, size: 10 };
      c.fill = solid(GRAY); c.border = border('thin');
      c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });
  };

  const dataRow = (ws: ExcelJS.Worksheet, row: number, values: any[], isAlt: boolean, numCols: Set<number> = new Set()) => {
    ws.getRow(row).height = 17;
    const bg = isAlt ? LGRAY : WHITE;
    values.forEach((v, ci) => {
      const c = ws.getCell(row, ci + 1);
      c.value = v ?? null; c.font = { name: FONT, size: 10 };
      c.fill = solid(bg); c.border = border('thin');
      c.alignment = { horizontal: numCols.has(ci) ? 'center' : 'left', vertical: 'middle' };
    });
  };

  const footerRow = (ws: ExcelJS.Worksheet, row: number, cols: number, labelCols: number, label: string, value: any) => {
    ws.getRow(row).height = 18;
    ws.mergeCells(row, 1, row, labelCols);
    const lc = ws.getCell(row, 1);
    lc.value = label; lc.font = { name: FONT, bold: true, size: 10 };
    lc.fill = solid(GRAY); lc.border = border('thin');
    lc.alignment = { horizontal: 'right', vertical: 'middle' };
    ws.mergeCells(row, labelCols + 1, row, cols);
    const vc = ws.getCell(row, labelCols + 1);
    vc.value = value; vc.font = { name: FONT, bold: true, size: 10 };
    vc.fill = solid(GRAY); vc.border = border('thin');
    vc.alignment = { horizontal: 'center', vertical: 'middle' };
  };

  const signatureBlock = (ws: ExcelJS.Worksheet, row: number, cols: number, name: string) => {
    ws.getRow(row).height = 20;
    ws.mergeCells(row, 1, row, Math.ceil(cols / 2));
    ws.getCell(row, 1).value = 'Администратор:';
    ws.getCell(row, 1).font = { name: FONT, size: 10 };
    ws.mergeCells(row, Math.ceil(cols / 2) + 1, row, cols);
    const sv = ws.getCell(row, Math.ceil(cols / 2) + 1);
    sv.value = name; sv.font = { name: FONT, size: 10 };
    sv.border = { bottom: { style: 'thin', color: { argb: BLACK } } };
    sv.alignment = { horizontal: 'center', vertical: 'bottom' };
    ws.getRow(row + 1).height = 14;
    ws.mergeCells(row + 1, Math.ceil(cols / 2) + 1, row + 1, cols);
    const sh = ws.getCell(row + 1, Math.ceil(cols / 2) + 1);
    sh.value = '(подпись / Ф.И.О.)'; sh.font = { name: FONT, size: 8, italic: true };
    sh.alignment = { horizontal: 'center', vertical: 'top' };
  };

  const downloadBuffer = async (wb: ExcelJS.Workbook, fileName: string) => {
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${fileName}.xlsx`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  return { FONT, BLACK, WHITE, GRAY, LGRAY, solid, border, secHeader, docHeader, tableHead, dataRow, footerRow, signatureBlock, downloadBuffer };
}

// ─── Excel builders ───────────────────────────────────────────────────────────

async function exportSummaryExcel(data: any, period: string, adminName: string, fileName: string) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = adminName; wb.created = new Date();
  const now = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
  const t = data.totals;
  const h = makeExcelHelpers(ExcelJS);
  const COLS = 6;

  // ── Лист 1: Общая статистика ──────────────────────────────────────
  const ws1 = wb.addWorksheet('Общая статистика', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 },
  });
  ws1.columns = [{ width: 40 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }];

  const reqs: [string, string][] = [['Администратор', adminName], ['Период', period], ['Дата', now]];
  let r = h.docHeader(ws1, 'Сводный отчёт', 'о деятельности платформы ВолонтёрКР', reqs, COLS);

  h.secHeader(ws1, r++, 'РАЗДЕЛ 1. ОБЩАЯ СТАТИСТИКА', COLS);
  h.tableHead(ws1, r++, ['Показатель', 'Значение']);
  const stats: [string, any][] = [
    ['Всего пользователей', t.totalUsers], ['Волонтёров', t.totalVolunteers],
    ['Организаторов', t.totalOrganizers], ['Всего проектов', t.totalProjects],
    ['Активных проектов', t.activeProjects], ['Завершённых проектов', t.completedProjects],
    ['Всего задач', t.totalTasks], ['Задач выполнено', t.completedTasks],
    ['Процент выполнения, %', t.totalTasks > 0 ? Math.round((t.completedTasks / t.totalTasks) * 100) : 0],
  ];
  stats.forEach(([label, val], i) => {
    ws1.getRow(r).height = 17;
    const bg = i % 2 === 0 ? h.WHITE : h.LGRAY;
    ws1.mergeCells(r, 1, r, COLS - 1);
    const lc = ws1.getCell(r, 1);
    lc.value = label; lc.font = { name: h.FONT, size: 10 };
    lc.fill = h.solid(bg); lc.border = h.border('thin');
    lc.alignment = { horizontal: 'left', vertical: 'middle' };
    ws1.mergeCells(r, COLS, r, COLS);
    const vc = ws1.getCell(r, COLS);
    vc.value = val; vc.font = { name: h.FONT, size: 10 };
    vc.fill = h.solid(bg); vc.border = h.border('thin');
    vc.alignment = { horizontal: 'center', vertical: 'middle' };
    r++;
  });

  r++;
  h.secHeader(ws1, r++, 'РАЗДЕЛ 2. ПРОЕКТЫ ПО СТАТУСАМ', COLS);
  h.tableHead(ws1, r++, ['Статус', 'Количество']);
  data.projectsByStatus.sort((a: any, b: any) => b.count - a.count).forEach((s: any, i: number) => {
    ws1.getRow(r).height = 17;
    const bg = i % 2 === 0 ? h.WHITE : h.LGRAY;
    ws1.mergeCells(r, 1, r, COLS - 1);
    const lc = ws1.getCell(r, 1); lc.value = STATUS_LABELS[s.status] ?? s.status;
    lc.font = { name: h.FONT, size: 10 }; lc.fill = h.solid(bg); lc.border = h.border('thin');
    lc.alignment = { horizontal: 'left', vertical: 'middle' };
    const vc = ws1.getCell(r, COLS); vc.value = s.count;
    vc.font = { name: h.FONT, size: 10 }; vc.fill = h.solid(bg); vc.border = h.border('thin');
    vc.alignment = { horizontal: 'center', vertical: 'middle' };
    r++;
  });

  r++;
  h.secHeader(ws1, r++, 'РАЗДЕЛ 3. ПРОЕКТЫ ПО КАТЕГОРИЯМ', COLS);
  h.tableHead(ws1, r++, ['Категория', 'Проектов']);
  data.categories.forEach((c: any, i: number) => {
    ws1.getRow(r).height = 17;
    const bg = i % 2 === 0 ? h.WHITE : h.LGRAY;
    ws1.mergeCells(r, 1, r, COLS - 1);
    const lc = ws1.getCell(r, 1); lc.value = c.name;
    lc.font = { name: h.FONT, size: 10 }; lc.fill = h.solid(bg); lc.border = h.border('thin');
    lc.alignment = { horizontal: 'left', vertical: 'middle' };
    const vc = ws1.getCell(r, COLS); vc.value = c.count;
    vc.font = { name: h.FONT, size: 10 }; vc.fill = h.solid(bg); vc.border = h.border('thin');
    vc.alignment = { horizontal: 'center', vertical: 'middle' };
    r++;
  });

  r++;
  h.secHeader(ws1, r++, 'РАЗДЕЛ 4. ДИНАМИКА ЗА 6 МЕСЯЦЕВ', COLS);
  h.tableHead(ws1, r++, ['Месяц', 'Регистраций', 'Проектов']);
  data.monthlyRegistrations.forEach((m: any, i: number) => {
    const mp = data.monthlyProjects[i];
    ws1.getRow(r).height = 17;
    const bg = i % 2 === 0 ? h.WHITE : h.LGRAY;
    ws1.mergeCells(r, 1, r, COLS - 2);
    const lc = ws1.getCell(r, 1); lc.value = m.label;
    lc.font = { name: h.FONT, size: 10 }; lc.fill = h.solid(bg); lc.border = h.border('thin');
    lc.alignment = { horizontal: 'left', vertical: 'middle' };
    [m.count, mp?.count ?? 0].forEach((v, ci) => {
      const c = ws1.getCell(r, COLS - 1 + ci); c.value = v;
      c.font = { name: h.FONT, size: 10 }; c.fill = h.solid(bg); c.border = h.border('thin');
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    r++;
  });

  r += 2;
  h.signatureBlock(ws1, r, COLS, adminName);

  // ── Лист 2: Топ волонтёры ─────────────────────────────────────────
  const ws2 = wb.addWorksheet('Топ волонтёры', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });
  ws2.columns = [{ width: 4 }, { width: 28 }, { width: 30 }, { width: 16 }, { width: 14 }, { width: 14 }];
  const COLS2 = 6;
  let r2 = h.docHeader(ws2, 'Топ-10 волонтёров', 'по выполненным задачам', [['Администратор', adminName], ['Период', period], ['Дата', now]], COLS2);
  h.secHeader(ws2, r2++, 'СПИСОК ВОЛОНТЁРОВ', COLS2);
  h.tableHead(ws2, r2++, ['#', 'Имя', 'Email', 'Город', 'Задач выполнено', 'Рейтинг']);
  data.topVolunteers.forEach((v: any, i: number) => {
    h.dataRow(ws2, r2++, [i + 1, v.name, v.email, v.city ?? '—', v.completedTasks, v.trustScore], i % 2 === 1, new Set([0, 4, 5]));
  });

  // ── Лист 3: Топ организаторы ──────────────────────────────────────
  const ws3 = wb.addWorksheet('Топ организаторы', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });
  ws3.columns = [{ width: 4 }, { width: 28 }, { width: 34 }, { width: 16 }, { width: 14 }];
  const COLS3 = 5;
  let r3 = h.docHeader(ws3, 'Топ-10 организаторов', 'по количеству проектов', [['Администратор', adminName], ['Период', period], ['Дата', now]], COLS3);
  h.secHeader(ws3, r3++, 'СПИСОК ОРГАНИЗАТОРОВ', COLS3);
  h.tableHead(ws3, r3++, ['#', 'Имя', 'Организация', 'Город', 'Проектов']);
  data.topOrganizers.forEach((o: any, i: number) => {
    h.dataRow(ws3, r3++, [i + 1, o.name, o.organizationName, o.city ?? '—', o.projectsCount], i % 2 === 1, new Set([0, 4]));
  });

  await h.downloadBuffer(wb, fileName);
}

async function exportUsersExcel(data: any, period: string, adminName: string, fileName: string) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = adminName; wb.created = new Date();
  const now = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
  const h = makeExcelHelpers(ExcelJS);
  const volunteers = data.users.filter((u: any) => u.role === 'volunteer');
  const organizers = data.users.filter((u: any) => u.role === 'organizer');
  const reqs: [string, string][] = [['Администратор', adminName], ['Период', period], ['Дата', now]];

  // ── Лист 1: Волонтёры ─────────────────────────────────────────────
  const ws1 = wb.addWorksheet('Волонтёры', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });
  ws1.columns = [{ width: 4 }, { width: 28 }, { width: 30 }, { width: 16 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 12 }, { width: 14 }];
  const COLS1 = 9;
  let r1 = h.docHeader(ws1, 'Отчёт по пользователям', 'Волонтёры платформы ВолонтёрКР', reqs, COLS1);
  h.secHeader(ws1, r1++, `РАЗДЕЛ 1. ВОЛОНТЁРЫ (${volunteers.length})`, COLS1);
  h.tableHead(ws1, r1++, ['#', 'Имя', 'Email', 'Город', 'Задач', 'Проектов', 'Рейтинг', 'Статус', 'Дата рег.']);
  volunteers.forEach((u: any, i: number) => {
    h.dataRow(ws1, r1++, [i+1, u.name, u.email, u.city ?? '—', u.completedTasks ?? 0, u.completedProjects ?? 0, u.trustScore ?? '0.0', USER_STATUS_LABELS[u.status] ?? u.status, u.registeredAt], i % 2 === 1, new Set([0, 4, 5, 6, 8]));
  });
  h.footerRow(ws1, r1++, COLS1, COLS1 - 1, 'Итого волонтёров:', volunteers.length);
  r1 += 2; h.signatureBlock(ws1, r1, COLS1, adminName);

  // ── Лист 2: Организаторы ──────────────────────────────────────────
  const ws2 = wb.addWorksheet('Организаторы', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });
  ws2.columns = [{ width: 4 }, { width: 26 }, { width: 30 }, { width: 28 }, { width: 16 }, { width: 16 }, { width: 12 }, { width: 14 }];
  const COLS2 = 8;
  let r2 = h.docHeader(ws2, 'Отчёт по пользователям', 'Организаторы платформы ВолонтёрКР', reqs, COLS2);
  h.secHeader(ws2, r2++, `РАЗДЕЛ 2. ОРГАНИЗАТОРЫ (${organizers.length})`, COLS2);
  h.tableHead(ws2, r2++, ['#', 'Имя', 'Email', 'Организация', 'Город', 'Верификация', 'Статус', 'Дата рег.']);
  organizers.forEach((u: any, i: number) => {
    h.dataRow(ws2, r2++, [i+1, u.name, u.email, u.organizationName ?? '—', u.city ?? '—', u.verificationStatus === 'verified' ? 'Верифицирован' : u.verificationStatus === 'pending' ? 'На проверке' : 'Не верифицирован', USER_STATUS_LABELS[u.status] ?? u.status, u.registeredAt], i % 2 === 1, new Set([0, 7]));
  });
  h.footerRow(ws2, r2++, COLS2, COLS2 - 1, 'Итого организаторов:', organizers.length);
  r2 += 2; h.signatureBlock(ws2, r2, COLS2, adminName);

  await h.downloadBuffer(wb, fileName);
}

async function exportProjectsExcel(data: any, period: string, adminName: string, fileName: string) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = adminName; wb.created = new Date();
  const now = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
  const h = makeExcelHelpers(ExcelJS);
  const projects = data.projects;
  const totalTasks = projects.reduce((s: number, p: any) => s + p.totalTasks, 0);
  const doneTasks  = projects.reduce((s: number, p: any) => s + p.completedTasks, 0);
  const totalPart  = projects.reduce((s: number, p: any) => s + p.participantsCount, 0);
  const rate       = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const ws = wb.addWorksheet('Проекты', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });
  ws.columns = [{ width: 4 }, { width: 30 }, { width: 13 }, { width: 14 }, { width: 22 }, { width: 16 }, { width: 11 }, { width: 11 }, { width: 11 }, { width: 20 }];
  const COLS = 10;
  const reqs: [string, string][] = [['Администратор', adminName], ['Период', period], ['Дата', now]];
  let r = h.docHeader(ws, 'Отчёт по проектам', 'платформы ВолонтёрКР', reqs, COLS);

  h.secHeader(ws, r++, 'РАЗДЕЛ 1. ОБЩАЯ СТАТИСТИКА', COLS);
  const statPairs: [string, any][] = [
    ['Всего проектов', projects.length], ['Всего участников', totalPart],
    ['Всего задач', totalTasks], ['Задач выполнено', doneTasks], ['Процент выполнения, %', rate],
  ];
  statPairs.forEach(([label, val], i) => {
    ws.getRow(r).height = 17;
    const bg = i % 2 === 0 ? h.WHITE : h.LGRAY;
    ws.mergeCells(r, 1, r, COLS - 1);
    const lc = ws.getCell(r, 1); lc.value = label;
    lc.font = { name: h.FONT, size: 10 }; lc.fill = h.solid(bg); lc.border = h.border('thin');
    lc.alignment = { horizontal: 'left', vertical: 'middle' };
    const vc = ws.getCell(r, COLS); vc.value = val;
    vc.font = { name: h.FONT, size: 10 }; vc.fill = h.solid(bg); vc.border = h.border('thin');
    vc.alignment = { horizontal: 'center', vertical: 'middle' };
    r++;
  });

  r++;
  h.secHeader(ws, r++, 'РАЗДЕЛ 2. СВОДНАЯ ТАБЛИЦА ПРОЕКТОВ', COLS);
  h.tableHead(ws, r++, ['#', 'Название', 'Статус', 'Категория', 'Организация', 'Локация', 'Волонтёры', 'Участников', 'Задачи', 'Период']);
  projects.forEach((p: any, i: number) => {
    h.dataRow(ws, r++, [i+1, p.title, STATUS_LABELS[p.status] ?? p.status, p.category, p.organizationName, p.location, `${p.currentVolunteers}/${p.maxVolunteers}`, p.participantsCount, `${p.completedTasks}/${p.totalTasks}`, `${p.startDate} — ${p.endDate}`], i % 2 === 1, new Set([0, 6, 7, 8]));
  });
  // Итоговая строка
  ws.getRow(r).height = 18;
  ws.mergeCells(r, 1, r, 6);
  const itL = ws.getCell(r, 1); itL.value = 'Итого:';
  itL.font = { name: h.FONT, bold: true, size: 10 }; itL.fill = h.solid(h.GRAY); itL.border = h.border('thin');
  itL.alignment = { horizontal: 'right', vertical: 'middle' };
  [[7, '—'], [8, totalPart], [9, `${doneTasks}/${totalTasks}`], [10, `${rate}%`]].forEach(([col, val]) => {
    const c = ws.getCell(r, col as number); c.value = val as any;
    c.font = { name: h.FONT, bold: true, size: 10 }; c.fill = h.solid(h.GRAY); c.border = h.border('thin');
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  r += 2;
  h.signatureBlock(ws, r, COLS, adminName);

  await h.downloadBuffer(wb, fileName);
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
                      <Tooltip text="Повторить">
                        <button onClick={() => entry.format === 'pdf' ? handlePDF(entry.params) : handleExcel(entry.params)}
                          className="p-2 text-gray-400 hover:text-[#00CC00] hover:bg-green-50 rounded-lg transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                      </Tooltip>
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
