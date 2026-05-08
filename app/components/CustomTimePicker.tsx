'use client';

import { useState, useRef, useEffect } from 'react';

interface CustomTimePickerProps {
  value: string; // HH:MM format
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function CustomTimePicker({
  value,
  onChange,
  placeholder = 'Выберите время',
  className = '',
  disabled = false,
}: CustomTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hours, setHours] = useState('12');
  const [minutes, setMinutes] = useState('00');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':');
      setHours(h);
      setMinutes(m);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleApply = () => {
    onChange(`${hours}:${minutes}`);
    setIsOpen(false);
  };

  const hourOptions = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-4 py-2 text-left bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer hover:border-[#00CC00]'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className={value ? 'text-gray-900' : 'text-gray-500'}>
              {value || placeholder}
            </span>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl p-4">
          <div className="flex gap-4 mb-4">
            {/* Hours */}
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-700 mb-2">Часы</label>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                {hourOptions.map((hour) => (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => setHours(hour)}
                    className={`w-full px-3 py-2 text-sm text-left transition-colors ${
                      hours === hour
                        ? 'bg-[#00CC00] text-white font-semibold'
                        : 'text-gray-700 hover:bg-green-50'
                    }`}
                  >
                    {hour}
                  </button>
                ))}
              </div>
            </div>

            {/* Minutes */}
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-700 mb-2">Минуты</label>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                {minuteOptions.map((minute) => (
                  <button
                    key={minute}
                    type="button"
                    onClick={() => setMinutes(minute)}
                    className={`w-full px-3 py-2 text-sm text-left transition-colors ${
                      minutes === minute
                        ? 'bg-[#00CC00] text-white font-semibold'
                        : 'text-gray-700 hover:bg-green-50'
                    }`}
                  >
                    {minute}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview and Apply */}
          <div className="pt-4 border-t border-gray-200">
            <div className="text-center mb-3">
              <span className="text-2xl font-bold text-gray-900">{hours}:{minutes}</span>
            </div>
            <button
              type="button"
              onClick={handleApply}
              className="w-full px-4 py-2 bg-[#00CC00] text-white rounded-lg font-semibold hover:bg-[#00b300] transition-colors"
            >
              Применить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
