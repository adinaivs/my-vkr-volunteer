"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import VolunteerNav from "../components/VolunteerNav";
import VolunteerSidebar from "../components/VolunteerSidebar";
import AiSupportButton from "@/app/components/AiSupportButton";
import { SidebarProvider } from "@/app/contexts/SidebarContext";
import { useSidebar } from "@/app/contexts/SidebarContext";
import { useTranslation } from "@/app/i18n/useTranslation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

interface TaskEvent {
  id: string;
  type: "task";
  assignmentId: string;
  taskId: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD (дедлайн задачи)
  color: string;
  status: string;
  taskStatus: string;
  project: {
    id: string;
    title: string;
    status: string;
    startDate?: string;
    endDate?: string;
  };
  skill?: { id: string; name: string };
  isAllDay: boolean;
}

interface PersonalEvent {
  id: string;
  type: "personal";
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD (startDate)
  endDate: string;
  startTime?: string;
  endTime?: string;
  color: string;
  isAllDay: boolean;
  location?: string;
  linkedTaskId?: string;
  linkedTask?: { id: string; title: string };
}

type CalendarEvent = TaskEvent | PersonalEvent;

type ViewMode = "year" | "month" | "week" | "day";

const MONTHS_RU = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];
const MONTHS_RU_GEN = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];
const DAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const DAYS_FULL = [
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
  "Воскресенье",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Понедельник = 0 ... воскресенье = 6
function getDayIndex(date: Date) {
  return (date.getDay() + 6) % 7;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = getDayIndex(d);
  d.setDate(d.getDate() - day);
  return d;
}

function isSameDay(a: string, b: string) {
  return a === b;
}

function formatTime(t: string) {
  return t; // HH:mm
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    assigned: "Назначена",
    completed: "Выполнена",
    confirmed: "Подтверждена",
    rejected: "Отклонена",
    cancelled: "Отменена",
  };
  return map[s] ?? s;
}

const COLORS = [
  "#00CC00",
  "#2563eb",
  "#dc2626",
  "#d97706",
  "#7c3aed",
  "#db2777",
  "#0891b2",
  "#059669",
  "#64748b",
];

// ─── New Event Modal ───────────────────────────────────────────────────────────

interface NewEventModalProps {
  initialDate: string;
  onClose: () => void;
  onSave: (ev: PersonalEvent) => void;
}

function NewEventModal({ initialDate, onClose, onSave }: NewEventModalProps) {
  const { t } = useTranslation("volunteer");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(initialDate);
  const [endDate, setEndDate] = useState(initialDate);
  const [isAllDay, setIsAllDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [color, setColor] = useState("#2563eb");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!title.trim()) {
      setError("Введите название");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/volunteer/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          startDate,
          endDate,
          startTime: isAllDay ? undefined : startTime,
          endTime: isAllDay ? undefined : endTime,
          color,
          isAllDay,
          location,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Ошибка");
        return;
      }
      onSave({
        id: data.event.id,
        type: "personal",
        title: data.event.title,
        description: data.event.description,
        date: startDate,
        endDate,
        startTime: isAllDay ? undefined : startTime,
        endTime: isAllDay ? undefined : endTime,
        color,
        isAllDay,
        location,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 z-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">
            {t.calendar?.addEvent || "Новое событие"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              {t.calendar?.eventTitle || "Название"} *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.calendar?.eventTitle || "Добавьте название"}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              {t.calendar?.eventDescription || "Описание"}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.calendar?.eventDescription || "Описание события"}
              rows={2}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                {t.calendar?.startTime || "Начало"}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (e.target.value > endDate) setEndDate(e.target.value);
                }}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                {t.calendar?.endTime || "Конец"}
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allday"
              checked={isAllDay}
              onChange={(e) => setIsAllDay(e.target.checked)}
              className="w-4 h-4 accent-[#00CC00]"
            />
            <label htmlFor="allday" className="text-sm text-gray-700">
              {t.calendar?.allDay || "Весь день"}
            </label>
          </div>

          {!isAllDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Время начала</label>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Время конца</label>
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent" />
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              {t.calendar?.eventLocation || "Место"}
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t.calendar?.eventLocation || "Место проведения"}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              {t.calendar?.color || "Цвет"}
            </label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${color === c ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : ""}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {t.common?.cancel || "Отмена"}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-[#00CC00] text-white rounded-xl text-sm font-medium hover:bg-[#00b300] disabled:opacity-60"
            >
              {saving
                ? t.common?.loading || "Сохранение..."
                : t.calendar?.save || "Сохранить"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Day Detail Drawer ─────────────────────────────────────────────────────────

interface DayDrawerProps {
  date: string;
  events: CalendarEvent[];
  onClose: () => void;
  onDelete: (id: string) => void;
  addedTaskIds: Set<string>;
  onAddTask: (taskId: string, deadline: string, title: string) => Promise<void>;
}

function DayDrawer({
  date,
  events,
  onClose,
  onDelete,
  addedTaskIds,
  onAddTask,
}: DayDrawerProps) {
  const d = parseDate(date);
  const dayLabel = `${d.getDate()} ${MONTHS_RU_GEN[d.getMonth()]} ${d.getFullYear()}`;
  const dayName = DAYS_FULL[getDayIndex(d)];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-lg mx-0 sm:mx-4 max-h-[80vh] flex flex-col z-10">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <div className="text-lg font-bold text-gray-900">{dayLabel}</div>
            <div className="text-sm text-gray-500">{dayName}</div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {events.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <svg
                className="w-12 h-12 mx-auto mb-3 opacity-30"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-sm">Нет событий в этот день</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="flex gap-3 p-4 rounded-xl border border-gray-100 hover:border-gray-200 bg-white shadow-sm"
                >
                  <div
                    className="w-1 rounded-full flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: ev.color, minHeight: "40px" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-gray-900 text-sm">
                        {ev.title}
                      </div>
                      {ev.type === "personal" && (
                        <button
                          onClick={() => onDelete(ev.id)}
                          className="p-1 text-gray-300 hover:text-red-500 flex-shrink-0 rounded transition-colors"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                    {ev.type === "task" && (
                      <div className="mt-1 space-y-1.5">
                        {/* Дедлайн задачи */}
                        <div className="flex items-center gap-1.5">
                          <svg
                            className="w-3 h-3 text-gray-400 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span className="text-xs text-gray-500">
                            Дедлайн задачи:{" "}
                            <span className="font-medium text-gray-700">
                              {parseDate(ev.date).toLocaleDateString("ru-RU", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                            </span>
                          </span>
                        </div>
                        {/* Статус */}
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: ev.color + "20",
                              color: ev.color,
                            }}
                          >
                            {statusLabel(ev.status)}
                          </span>
                        </div>
                        {/* Проект */}
                        <div className="text-xs text-gray-500">
                          Проект:{" "}
                          <span className="font-medium text-gray-700">
                            {ev.project.title}
                          </span>
                        </div>
                        {/* Конец проекта */}
                        {ev.project.endDate && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <svg
                              className="w-3 h-3 text-gray-400 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            Конец проекта:{" "}
                            <span className="font-medium text-gray-700 ml-0.5">
                              {parseDate(ev.project.endDate).toLocaleDateString(
                                "ru-RU",
                                {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                },
                              )}
                            </span>
                          </div>
                        )}
                        {ev.skill && (
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <svg
                              className="w-3 h-3 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                              />
                            </svg>
                            Навык: {ev.skill.name}
                          </div>
                        )}
                        {ev.description && (
                          <div className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                            {ev.description}
                          </div>
                        )}
                      </div>
                    )}
                    {ev.type === "personal" && (
                      <div className="mt-1 space-y-1.5">
                        {/* Диапазон дат */}
                        {ev.date !== ev.endDate ? (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <svg
                              className="w-3 h-3 text-gray-400 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            <span className="font-medium text-gray-700">
                              {parseDate(ev.date).toLocaleDateString("ru-RU", {
                                day: "numeric",
                                month: "short",
                              })}
                              {" — "}
                              {parseDate(ev.endDate).toLocaleDateString(
                                "ru-RU",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <svg
                              className="w-3 h-3 text-gray-400 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            <span className="font-medium text-gray-700">
                              {parseDate(ev.date).toLocaleDateString("ru-RU", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        )}
                        {/* Время */}
                        {!ev.isAllDay && ev.startTime && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <svg
                              className="w-3 h-3 text-gray-400 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            {formatTime(ev.startTime)}
                            {ev.endTime ? ` — ${formatTime(ev.endTime)}` : ""}
                          </div>
                        )}
                        {ev.location && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <svg
                              className="w-3 h-3 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            {ev.location}
                          </div>
                        )}
                        {ev.description && (
                          <div className="text-xs text-gray-500 line-clamp-2">
                            {ev.description}
                          </div>
                        )}
                        {ev.linkedTask && (
                          <div className="text-xs text-gray-400">
                            Задача: {ev.linkedTask.title}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Year View ─────────────────────────────────────────────────────────────────

function YearView({
  year,
  events,
  today,
  onSelectDay,
}: {
  year: number;
  events: CalendarEvent[];
  today: string;
  onSelectDay: (date: string) => void;
}) {
  const eventDates = new Set(events.map((e) => e.date));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 12 }, (_, mi) => {
        const firstDay = new Date(year, mi, 1);
        const daysInMonth = new Date(year, mi + 1, 0).getDate();
        const startDow = getDayIndex(firstDay);
        const cells: (number | null)[] = [
          ...Array(startDow).fill(null),
          ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
        ];
        while (cells.length % 7 !== 0) cells.push(null);

        return (
          <div
            key={mi}
            className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="text-center font-semibold text-gray-800 text-sm mb-2">
              {MONTHS_RU[mi]}
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {["П", "В", "С", "Ч", "П", "С", "В"].map((d, i) => (
                <div key={i} className="text-[10px] text-gray-400 font-medium">
                  {d}
                </div>
              ))}
              {cells.map((day, i) => {
                if (!day) return <div key={i} />;
                const dateStr = `${year}-${String(mi + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const hasEv = eventDates.has(dateStr);
                const isToday = dateStr === today;
                return (
                  <button
                    key={i}
                    onClick={() => onSelectDay(dateStr)}
                    className={`text-[11px] w-full aspect-square rounded-full flex items-center justify-center transition-colors relative font-medium
                      ${isToday ? "bg-[#00CC00] text-white" : hasEv ? "text-gray-900 hover:bg-gray-100" : "text-gray-500 hover:bg-gray-50"}`}
                  >
                    {day}
                    {hasEv && !isToday && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#00CC00]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Month View ────────────────────────────────────────────────────────────────

function MonthView({
  year,
  month,
  events,
  today,
  onSelectDay,
}: {
  year: number;
  month: number;
  events: CalendarEvent[];
  today: string;
  onSelectDay: (date: string) => void;
}) {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = getDayIndex(firstDay);
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells: { date: string; current: boolean }[] = [];
  for (let i = startDow - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const m = month === 0 ? 12 : month;
    const y = month === 0 ? year - 1 : year;
    cells.push({
      date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      current: false,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      date: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      current: true,
    });
  }
  while (cells.length < 42) {
    const idx = cells.length - daysInMonth - startDow + 1;
    const m = month === 11 ? 1 : month + 2;
    const y = month === 11 ? year + 1 : year;
    cells.push({
      date: `${y}-${String(m).padStart(2, "0")}-${String(idx).padStart(2, "0")}`,
      current: false,
    });
  }

  // Для каждого события определяем диапазон дат
  interface SpanEvent {
    id: string;
    title: string;
    color: string;
    startStr: string;
    endStr: string;
    type: "task" | "personal";
    originalDate: string;
  }

  const spanEvents: SpanEvent[] = events.map((ev) => {
    if (ev.type === "task") {
      return {
        id: ev.id,
        title: ev.title,
        color: ev.color,
        startStr: ev.project.startDate ?? ev.date,
        endStr: ev.project.endDate ?? ev.date,
        type: "task" as const,
        originalDate: ev.date,
      };
    } else {
      return {
        id: ev.id,
        title: ev.title,
        color: ev.color,
        startStr: ev.date,
        endStr: ev.endDate ?? ev.date,
        type: "personal" as const,
        originalDate: ev.date,
      };
    }
  });

  // Для каждой ячейки дня — список событий которые покрывают этот день
  const eventsByDate = new Map<string, SpanEvent[]>();
  for (const cell of cells) {
    const dayEvs = spanEvents.filter(
      (ev) => cell.date >= ev.startStr && cell.date <= ev.endStr,
    );
    if (dayEvs.length > 0) eventsByDate.set(cell.date, dayEvs);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Заголовок дней недели */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {DAYS_SHORT.map((d) => (
          <div
            key={d}
            className="py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Ячейки */}
      <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
        {cells.map(({ date, current }) => {
          const dayNum = parseInt(date.split("-")[2]);
          const isToday = date === today;
          const dayEvs = eventsByDate.get(date) ?? [];
          const shown = dayEvs.slice(0, 3);
          const more = dayEvs.length - 3;

          return (
            <div
              key={date}
              onClick={() => onSelectDay(date)}
              className={`min-h-[90px] p-1 cursor-pointer hover:bg-gray-50 transition-colors ${!current ? "bg-gray-50/40" : ""}`}
            >
              {/* Число */}
              <div
                className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1 mx-auto
                ${isToday ? "bg-[#00CC00] text-white" : current ? "text-gray-900" : "text-gray-400"}`}
              >
                {dayNum}
              </div>

              {/* Блоки событий */}
              <div className="space-y-0.5">
                {shown.map((ev) => {
                  const isFirst = date === ev.startStr;
                  const isLast = date === ev.endStr;
                  // Скругление у всех блоков одинаковое
                  const borderRadius = "6px";
                  // Отступы: у первого — слева, у последнего — справа, у средних — нет
                  const marginLeft = isFirst ? 1 : 0;
                  const marginRight = isLast ? 1 : 0;

                  return (
                    <div
                      key={ev.id}
                      style={{
                        backgroundColor: ev.color,
                        borderRadius,
                        marginLeft,
                        marginRight,
                        opacity: current ? 1 : 0.5,
                      }}
                      className="h-[18px] flex items-center overflow-hidden"
                    >
                      {/* Название в каждом блоке */}
                      <span className="text-[10px] font-medium text-white truncate px-1.5 leading-none">
                        {ev.type === "task" ? "● " : ""}
                        {ev.title}
                      </span>
                    </div>
                  );
                })}
                {more > 0 && (
                  <div className="text-[10px] text-gray-400 px-1">+{more}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week View ─────────────────────────────────────────────────────────────────

function WeekView({
  weekStart,
  events,
  today,
  onSelectDay,
}: {
  weekStart: Date;
  events: CalendarEvent[];
  today: string;
  onSelectDay: (date: string) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const dayStrings = days.map((d) => toLocalDateString(d));
  const weekStartStr = dayStrings[0];
  const weekEndStr = dayStrings[6];

  // SpanEvents — те же что в MonthView
  interface SpanEvent {
    id: string;
    title: string;
    color: string;
    startStr: string;
    endStr: string;
    type: "task" | "personal";
    originalDate: string;
  }

  const spanEvents: SpanEvent[] = events.map((ev) => {
    if (ev.type === "task") {
      return {
        id: ev.id,
        title: ev.title,
        color: ev.color,
        startStr: ev.project.startDate ?? ev.date,
        endStr: ev.project.endDate ?? ev.date,
        type: "task" as const,
        originalDate: ev.date,
      };
    } else {
      return {
        id: ev.id,
        title: ev.title,
        color: ev.color,
        startStr: ev.date,
        endStr: ev.endDate ?? ev.date,
        type: "personal" as const,
        originalDate: ev.date,
      };
    }
  });

  // Только события, которые пересекаются с текущей неделей
  const weekSpans = spanEvents.filter(
    (ev) => ev.endStr >= weekStartStr && ev.startStr <= weekEndStr,
  );

  // Для каждого дня — список событий покрывающих его (для строки "весь день")
  const allDayByDate = new Map<string, SpanEvent[]>();
  for (const dateStr of dayStrings) {
    allDayByDate.set(
      dateStr,
      weekSpans.filter((ev) => dateStr >= ev.startStr && dateStr <= ev.endStr),
    );
  }

  // Timed события (личные с временем) — только по startDate
  const timedByDate = new Map<string, PersonalEvent[]>();
  for (const ev of events) {
    if (ev.type === "personal" && !ev.isAllDay) {
      if (!timedByDate.has(ev.date)) timedByDate.set(ev.date, []);
      timedByDate.get(ev.date)!.push(ev);
    }
  }

  const hours = Array.from({ length: 18 }, (_, i) => i + 6);

  // Максимальное количество событий в строке "весь день" для высоты
  const maxAllDay = Math.max(
    ...dayStrings.map((d) => allDayByDate.get(d)?.length ?? 0),
    1,
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Заголовок */}
      <div
        className="grid border-b border-gray-100"
        style={{ gridTemplateColumns: "60px repeat(7,1fr)" }}
      >
        <div className="border-r border-gray-100" />
        {days.map((d) => {
          const dateStr = toLocalDateString(d);
          const isToday = dateStr === today;
          return (
            <div
              key={dateStr}
              onClick={() => onSelectDay(dateStr)}
              className="py-3 text-center cursor-pointer hover:bg-gray-50 border-r border-gray-100 last:border-r-0"
            >
              <div className="text-xs font-medium text-gray-500 uppercase">
                {DAYS_SHORT[getDayIndex(d)]}
              </div>
              <div
                className={`w-9 h-9 flex items-center justify-center rounded-full text-base font-semibold mx-auto mt-1
                ${isToday ? "bg-[#00CC00] text-white" : "text-gray-900"}`}
              >
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Строка "весь день" — блоки по каждому дню */}
      <div
        className="grid border-b border-gray-100"
        style={{
          gridTemplateColumns: "60px repeat(7,1fr)",
          minHeight: 16 + maxAllDay * 22,
        }}
      >
        <div className="border-r border-gray-100 flex items-start justify-center pt-1">
          <span className="text-[10px] text-gray-400 font-medium">
            весь
            <br />
            день
          </span>
        </div>
        {dayStrings.map((dateStr) => {
          const evs = allDayByDate.get(dateStr) ?? [];
          return (
            <div
              key={dateStr}
              className="p-0.5 border-r border-gray-100 last:border-r-0 space-y-0.5"
            >
              {evs.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => onSelectDay(dateStr)}
                  className="h-[18px] flex items-center overflow-hidden cursor-pointer rounded-md"
                  style={{ backgroundColor: ev.color }}
                >
                  <span className="text-[10px] font-medium text-white truncate px-1.5 leading-none">
                    {ev.type === "task" ? "● " : ""}
                    {ev.title}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Часовые строки */}
      <div className="overflow-y-auto" style={{ maxHeight: "500px" }}>
        {hours.map((h) => (
          <div
            key={h}
            className="grid border-b border-gray-50"
            style={{ gridTemplateColumns: "60px repeat(7,1fr)" }}
          >
            <div className="border-r border-gray-100 py-2 text-right pr-2">
              <span className="text-[11px] text-gray-400">{h}:00</span>
            </div>
            {dayStrings.map((dateStr) => {
              const evs = (timedByDate.get(dateStr) ?? []).filter((e) => {
                const hh = e.startTime
                  ? parseInt(e.startTime.split(":")[0])
                  : null;
                return hh === h;
              });
              return (
                <div
                  key={dateStr}
                  className="border-r border-gray-100 last:border-r-0 min-h-[48px] p-0.5 relative"
                >
                  {evs.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => onSelectDay(dateStr)}
                      className="text-[11px] px-1.5 py-1 rounded-md text-white font-medium cursor-pointer mb-0.5"
                      style={{ backgroundColor: ev.color }}
                    >
                      {ev.startTime} {ev.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Day View ──────────────────────────────────────────────────────────────────

function DayView({
  date,
  events,
  today,
  onAddEvent,
}: {
  date: string;
  events: CalendarEvent[];
  today: string;
  onAddEvent: () => void;
}) {
  const d = parseDate(date);
  const isToday = date === today;
  const allDay = events.filter((e) => e.isAllDay);
  const timed = events.filter(
    (e): e is PersonalEvent => !e.isAllDay && e.type === "personal",
  );
  const hours = Array.from({ length: 18 }, (_, i) => i + 6);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <div
            className={`text-3xl font-bold ${isToday ? "text-[#00CC00]" : "text-gray-900"}`}
          >
            {d.getDate()}
          </div>
          <div className="text-gray-500 text-sm">
            {DAYS_FULL[getDayIndex(d)]}, {MONTHS_RU_GEN[d.getMonth()]}{" "}
            {d.getFullYear()}
          </div>
        </div>
        <button
          onClick={onAddEvent}
          className="flex items-center gap-2 px-4 py-2 bg-[#00CC00] text-white rounded-xl text-sm font-medium hover:bg-[#00b300] transition-colors shadow-sm"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Добавить
        </button>
      </div>

      {allDay.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
            Весь день
          </div>
          <div className="space-y-1.5">
            {allDay.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-white text-sm font-medium"
                style={{ backgroundColor: ev.color }}
              >
                {ev.type === "task" && (
                  <svg
                    className="w-4 h-4 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                )}
                <span>{ev.title}</span>
                {ev.type === "task" && (
                  <span className="ml-auto text-xs opacity-80">
                    {statusLabel(ev.status)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-y-auto" style={{ maxHeight: "500px" }}>
        {hours.map((h) => {
          const hEvs = timed.filter(
            (e) => e.startTime && parseInt(e.startTime.split(":")[0]) === h,
          );
          return (
            <div key={h} className="flex border-b border-gray-50 min-h-[56px]">
              <div className="w-16 flex-shrink-0 py-2 text-right pr-3 text-xs text-gray-400 font-medium">
                {h}:00
              </div>
              <div className="flex-1 py-1 px-2 relative">
                {hEvs.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-white text-sm font-medium mb-1"
                    style={{ backgroundColor: ev.color }}
                  >
                    <span className="text-xs opacity-80">
                      {ev.startTime}
                      {ev.endTime ? `–${ev.endTime}` : ""}
                    </span>
                    <span>{ev.title}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {events.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <svg
            className="w-12 h-12 mx-auto mb-3 opacity-30"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm">Нет событий</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Calendar Content ─────────────────────────────────────────────────────

function CalendarContent({ user }: { user: User }) {
  const { collapsed } = useSidebar();
  const { t } = useTranslation("volunteer");
  const today = toLocalDateString(new Date());

  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [newEventDate, setNewEventDate] = useState(today);
  const [addedTaskIds, setAddedTaskIds] = useState<Set<string>>(new Set());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/volunteer/calendar?year=${year}&month=${month + 1}`,
      );
      if (!res.ok) return;
      const data = await res.json();
      const all: CalendarEvent[] = [...data.taskEvents, ...data.personalEvents];
      setEvents(all);
      // Собираем ID задач уже добавленных в календарь
      const linked = new Set<string>(
        data.personalEvents
          .filter((e: PersonalEvent) => e.linkedTaskId)
          .map((e: PersonalEvent) => e.linkedTaskId as string),
      );
      setAddedTaskIds(linked);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Title for the header
  function getTitle() {
    if (view === "year") return String(year);
    if (view === "month") return `${MONTHS_RU[month]} ${year}`;
    if (view === "week") {
      const mon = getMonday(currentDate);
      const sun = new Date(mon);
      sun.setDate(sun.getDate() + 6);
      if (mon.getMonth() === sun.getMonth()) {
        return `${mon.getDate()} – ${sun.getDate()} ${MONTHS_RU_GEN[mon.getMonth()]} ${mon.getFullYear()}`;
      }
      return `${mon.getDate()} ${MONTHS_RU_GEN[mon.getMonth()]} – ${sun.getDate()} ${MONTHS_RU_GEN[sun.getMonth()]} ${sun.getFullYear()}`;
    }
    return `${currentDate.getDate()} ${MONTHS_RU_GEN[month]} ${year}`;
  }

  function navigate(dir: 1 | -1) {
    const d = new Date(currentDate);
    if (view === "year") d.setFullYear(d.getFullYear() + dir);
    else if (view === "month") d.setMonth(d.getMonth() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  }

  function goToday() {
    setCurrentDate(new Date());
  }

  function handleSelectDay(date: string) {
    if (view === "year") {
      setCurrentDate(parseDate(date));
      setView("month");
      return;
    }
    setSelectedDay(date);
  }

  function handleDeleteEvent(id: string) {
    fetch(`/api/volunteer/calendar/events/${id}`, { method: "DELETE" }).then(
      () => {
        setEvents((prev) => prev.filter((e) => e.id !== id));
        if (selectedDay) {
          const remaining = events.filter(
            (e) => e.id !== id && e.date === selectedDay,
          );
          if (remaining.length === 0) setSelectedDay(null);
        }
      },
    );
  }

  function handleNewEvent(ev: PersonalEvent) {
    setEvents((prev) => [...prev, ev]);
    setShowNewEvent(false);
  }

  function openNewEvent(date?: string) {
    setNewEventDate(date ?? toLocalDateString(currentDate));
    setShowNewEvent(true);
  }

  async function handleAddTask(
    taskId: string,
    deadline: string,
    title: string,
  ) {
    const res = await fetch("/api/volunteer/calendar/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        startDate: deadline,
        endDate: deadline,
        color: "#00CC00",
        isAllDay: true,
        taskId,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setAddedTaskIds((prev) => new Set([...prev, taskId]));
      const newEv: PersonalEvent = {
        id: data.event.id,
        type: "personal",
        title,
        date: deadline,
        endDate: deadline,
        color: "#00CC00",
        isAllDay: true,
        linkedTaskId: taskId,
      };
      setEvents((prev) => [...prev, newEv]);
    }
  }

  const dayEvents = selectedDay
    ? events.filter((e) => {
        if (e.type === "task") {
          const start = e.project.startDate ?? e.date;
          const end = e.project.endDate ?? e.date;
          return selectedDay >= start && selectedDay <= end;
        } else {
          const start = e.date;
          const end = e.endDate ?? e.date;
          return selectedDay >= start && selectedDay <= end;
        }
      })
    : [];

  const weekStart = getMonday(currentDate);

  return (
    <div
      className={`transition-all duration-300 ${collapsed ? "lg:ml-20" : "lg:ml-64"}`}
    >
      <div className="min-h-screen bg-green-50 pb-20 lg:pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 text-gray-500 hover:text-gray-900 hover:bg-white rounded-xl border border-gray-200 shadow-sm transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button
                onClick={() => navigate(1)}
                className="p-2 text-gray-500 hover:text-gray-900 hover:bg-white rounded-xl border border-gray-200 shadow-sm transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                {getTitle()}
              </h1>
              <button
                onClick={goToday}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-xl hover:bg-white text-gray-600 shadow-sm transition-colors"
              >
                {t.calendar?.today || "Сегодня"}
              </button>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* View switcher */}
              <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                {(["year", "month", "week", "day"] as ViewMode[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${view === v ? "bg-[#00CC00] text-white" : "text-gray-600 hover:bg-gray-50"}`}
                  >
                    {v === "year"
                      ? t.calendar?.viewYear || "Год"
                      : v === "month"
                        ? t.calendar?.viewMonth || "Месяц"
                        : v === "week"
                          ? t.calendar?.viewWeek || "Неделя"
                          : t.calendar?.viewDay || "День"}
                  </button>
                ))}
              </div>

              <button
                onClick={() => openNewEvent()}
                className="flex items-center gap-2 px-4 py-2 bg-[#00CC00] text-white rounded-xl text-sm font-semibold hover:bg-[#00b300] transition-colors shadow-sm whitespace-nowrap"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                {t.calendar?.addEvent || "Новое событие"}
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-3 h-3 rounded-full bg-[#00CC00]" />
              {t.calendar?.legendTask || "Задача"}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-3 h-3 rounded-full bg-[#2563eb]" />
              {t.taskStatus?.confirmed || "Подтверждена"}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-3 h-3 rounded-full border border-gray-300 bg-white" />
              {t.calendar?.legendPersonal || "Личное событие"}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-8 h-8 border-2 border-[#00CC00] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {view === "year" && (
                <YearView
                  year={year}
                  events={events}
                  today={today}
                  onSelectDay={handleSelectDay}
                />
              )}
              {view === "month" && (
                <MonthView
                  year={year}
                  month={month}
                  events={events}
                  today={today}
                  onSelectDay={handleSelectDay}
                />
              )}
              {view === "week" && (
                <WeekView
                  weekStart={weekStart}
                  events={events}
                  today={today}
                  onSelectDay={handleSelectDay}
                />
              )}
              {view === "day" && (
                <DayView
                  date={toLocalDateString(currentDate)}
                  events={events.filter(
                    (e) => e.date === toLocalDateString(currentDate),
                  )}
                  today={today}
                  onAddEvent={() =>
                    openNewEvent(toLocalDateString(currentDate))
                  }
                />
              )}
            </>
          )}

          {/* Task deadlines sidebar section */}
          {!loading && (view === "month" || view === "week") && (
            <TaskSidebar
              events={events}
              today={today}
              addedTaskIds={addedTaskIds}
              onAddTask={handleAddTask}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {selectedDay && (
        <DayDrawer
          date={selectedDay}
          events={dayEvents}
          onClose={() => setSelectedDay(null)}
          onDelete={handleDeleteEvent}
          addedTaskIds={addedTaskIds}
          onAddTask={handleAddTask}
        />
      )}

      {showNewEvent && (
        <NewEventModal
          initialDate={newEventDate}
          onClose={() => setShowNewEvent(false)}
          onSave={handleNewEvent}
        />
      )}
    </div>
  );
}

// ─── Task Sidebar ──────────────────────────────────────────────────────────────

function TaskSidebar({
  events,
  today,
  addedTaskIds,
  onAddTask,
}: {
  events: CalendarEvent[];
  today: string;
  addedTaskIds: Set<string>;
  onAddTask: (taskId: string, deadline: string, title: string) => Promise<void>;
}) {
  const { t } = useTranslation("volunteer");
  const tasks = events
    .filter((e): e is TaskEvent => e.type === "task")
    .sort((a, b) => a.date.localeCompare(b.date));

  const upcoming = tasks
    .filter(
      (t) => t.date >= today && !["completed", "confirmed"].includes(t.status),
    )
    .slice(0, 8);
  const [adding, setAdding] = useState<string | null>(null);

  if (upcoming.length === 0) return null;

  async function add(t: TaskEvent) {
    setAdding(t.taskId);
    await onAddTask(t.taskId, t.date, t.title);
    setAdding(null);
  }

  return (
    <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
        <svg
          className="w-5 h-5 text-[#00CC00]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
        {t.calendar?.upcomingTasks || "Предстоящие задачи"}
      </h2>
      <div className="space-y-2">
        {upcoming.map((t) => {
          const d = parseDate(t.date);
          const daysLeft = Math.ceil(
            (d.getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000,
          );
          const isAdded = addedTaskIds.has(t.taskId);
          return (
            <div
              key={t.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: t.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {t.title}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500">
                    {t.project.title}
                  </span>
                  <span className="text-xs text-gray-300">·</span>
                  <span
                    className={`text-xs font-medium ${daysLeft <= 3 ? "text-red-500" : daysLeft <= 7 ? "text-amber-500" : "text-gray-400"}`}
                  >
                    {daysLeft === 0
                      ? "Сегодня"
                      : daysLeft === 1
                        ? "Завтра"
                        : `через ${daysLeft} д.`}
                  </span>
                </div>
              </div>
              <button
                onClick={() => !isAdded && add(t)}
                disabled={isAdded || adding === t.taskId}
                title={
                  isAdded
                    ? t.calendar?.alreadyAdded || "Уже в календаре"
                    : t.calendar?.addToCalendar || "Добавить в календарь"
                }
                className={`flex-shrink-0 p-2 rounded-xl transition-colors ${
                  isAdded
                    ? "text-[#00CC00] bg-green-50 cursor-default"
                    : adding === t.taskId
                      ? "text-gray-300 cursor-wait"
                      : "text-gray-400 hover:text-[#00CC00] hover:bg-green-50"
                }`}
              >
                {isAdded ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me").then(async (res) => {
      if (!res.ok) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      if (data.user.role !== "volunteer") {
        router.push("/login");
        return;
      }
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
        <VolunteerNav user={user} />
        <VolunteerSidebar user={user} />
        <main className="pt-20 lg:pt-24">
          <CalendarContent user={user} />
        </main>
        <AiSupportButton />
      </div>
    </SidebarProvider>
  );
}
