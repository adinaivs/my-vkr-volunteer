'use client';

import { useState, useRef, useEffect } from 'react';

interface DateRangePickerProps {
  startDate: string;   // YYYY-MM-DD
  endDate: string;     // YYYY-MM-DD
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  disabled?: boolean;
}

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];
const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function toISO(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function formatDisplay(iso: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function getDays(date: Date): (number | null)[] {
  const y = date.getFullYear();
  const m = date.getMonth();
  const firstDow = new Date(y, m, 1).getDay(); // 0=Sun
  const startOffset = firstDow === 0 ? 6 : firstDow - 1; // Mon=0
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const days: (number | null)[] = Array(startOffset).fill(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  return days;
}

export default function DateRangePicker({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  disabled = false,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<'start' | 'end'>('start');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const base = startDate ? new Date(startDate) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const openFor = (field: 'start' | 'end') => {
    if (disabled) return;
    setEditing(field);
    if (field === 'start' && startDate) setCurrentMonth(new Date(startDate + 'T00:00:00'));
    if (field === 'end' && (endDate || startDate))
      setCurrentMonth(new Date((endDate || startDate) + 'T00:00:00'));
    setOpen(true);
  };

  const selectDay = (day: number) => {
    const iso = toISO(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const today = new Date().toISOString().split('T')[0];
    if (iso < today) return; // не раньше сегодня

    if (editing === 'start') {
      onStartChange(iso);
      // если конец раньше начала — сбросить конец
      if (endDate && iso > endDate) onEndChange('');
      setEditing('end');
    } else {
      if (startDate && iso < startDate) {
        // если выбрали дату раньше начала — меняем начало
        onStartChange(iso);
        onEndChange('');
        setEditing('end');
      } else {
        onEndChange(iso);
        setOpen(false);
      }
    }
  };

  const getDayISO = (day: number) =>
    toISO(currentMonth.getFullYear(), currentMonth.getMonth(), day);

  const isStart    = (day: number) => getDayISO(day) === startDate;
  const isEnd      = (day: number) => getDayISO(day) === endDate;
  const isInRange  = (day: number) => {
    if (!startDate || !endDate) return false;
    const iso = getDayISO(day);
    return iso > startDate && iso < endDate;
  };
  const isDisabled = (day: number) => {
    const iso = getDayISO(day);
    return iso < new Date().toISOString().split('T')[0];
  };
  const isToday = (day: number) =>
    getDayISO(day) === new Date().toISOString().split('T')[0];

  const prev = () => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const next = () => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  const CalIcon = () => (
    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );

  return (
    <div ref={ref} className="relative">
      {/* Два инпута в одну строку */}
      <div className="flex items-center gap-2">
        {/* Начало */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => openFor('start')}
          className={`flex-1 flex items-center gap-2 px-3 py-2.5 bg-white border rounded-lg text-sm transition-all text-left ${
            open && editing === 'start'
              ? 'border-[#00CC00] ring-2 ring-[#00CC00]/20'
              : 'border-gray-300 hover:border-[#00CC00]'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <CalIcon />
          <span className={startDate ? 'text-gray-900' : 'text-gray-400'}>
            {startDate ? formatDisplay(startDate) : 'Дата начала'}
          </span>
        </button>

        <span className="text-gray-400 text-sm font-medium select-none">—</span>

        {/* Конец */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => openFor('end')}
          className={`flex-1 flex items-center gap-2 px-3 py-2.5 bg-white border rounded-lg text-sm transition-all text-left ${
            open && editing === 'end'
              ? 'border-[#00CC00] ring-2 ring-[#00CC00]/20'
              : 'border-gray-300 hover:border-[#00CC00]'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <CalIcon />
          <span className={endDate ? 'text-gray-900' : 'text-gray-400'}>
            {endDate ? formatDisplay(endDate) : 'Дата окончания'}
          </span>
        </button>
      </div>

      {/* Календарь */}
      {open && !disabled && (
        <div className="absolute z-50 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 w-72">
          {/* Подсказка */}
          <p className="text-xs text-center text-gray-400 mb-3">
            {editing === 'start' ? 'Выберите дату начала' : 'Выберите дату окончания'}
          </p>

          {/* Навигация */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prev}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-gray-900">
              {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <button type="button" onClick={next}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Дни недели */}
          <div className="grid grid-cols-7 mb-1">
            {WEEK_DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Ячейки */}
          <div className="grid grid-cols-7">
            {getDays(currentMonth).map((day, i) => {
              if (!day) return <div key={`e${i}`} />;

              const start  = isStart(day);
              const end    = isEnd(day);
              const range  = isInRange(day);
              const dis    = isDisabled(day);
              const tod    = isToday(day);

              return (
                <div key={day} className={`relative flex items-center justify-center h-8 ${range ? 'bg-green-50' : ''} ${start && endDate ? 'rounded-l-full' : ''} ${end && startDate ? 'rounded-r-full' : ''}`}>
                  <button
                    type="button"
                    disabled={dis}
                    onClick={() => !dis && selectDay(day)}
                    className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium transition-all z-10 relative
                      ${start || end
                        ? 'bg-[#00CC00] text-white font-bold shadow-sm'
                        : tod
                        ? 'text-[#00CC00] font-bold ring-1 ring-[#00CC00]'
                        : dis
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-700 hover:bg-green-100 hover:text-[#00CC00] cursor-pointer'
                      }`}
                  >
                    {day}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Сегодня */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                const iso = new Date().toISOString().split('T')[0];
                if (editing === 'start') { onStartChange(iso); if (endDate && iso > endDate) onEndChange(''); setEditing('end'); }
                else { if (!startDate || iso >= startDate) { onEndChange(iso); setOpen(false); } }
              }}
              className="w-full py-1.5 text-xs font-medium text-[#00CC00] hover:bg-green-50 rounded-lg transition-colors"
            >
              Сегодня
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
