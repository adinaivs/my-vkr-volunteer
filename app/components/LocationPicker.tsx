'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

// Динамический импорт карты (только на клиенте)
const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-gray-100 rounded-xl flex items-center justify-center">
      <div className="text-gray-500">Загрузка карты...</div>
    </div>
  ),
});

interface LocationSuggestion {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    road?: string;
    house_number?: string;
  };
}

interface LocationPickerProps {
  value: string;
  onChange: (location: string, lat?: number, lon?: number) => void;
  placeholder?: string;
}

export default function LocationPicker({ value, onChange, placeholder }: LocationPickerProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lon: number } | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Закрытие выпадающего списка при клике вне компонента
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Поиск адресов через Nominatim API (OpenStreetMap)
  const searchLocation = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      // Используем Nominatim API для поиска адресов
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `format=json&q=${encodeURIComponent(query)}&` +
        `countrycodes=kg&` + // Ограничиваем поиск Кыргызстаном
        `addressdetails=1&` +
        `limit=5`,
        {
          headers: {
            'Accept-Language': 'ru',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Ошибка поиска адреса:', error);
    } finally {
      setLoading(false);
    }
  };

  // Обработка ввода с debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);

    // Очищаем предыдущий таймер
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Устанавливаем новый таймер для поиска
    debounceTimer.current = setTimeout(() => {
      searchLocation(newValue);
    }, 500);
  };

  // Выбор адреса из списка
  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    setInputValue(suggestion.display_name);
    onChange(suggestion.display_name, parseFloat(suggestion.lat), parseFloat(suggestion.lon));
    setSelectedCoords({ lat: parseFloat(suggestion.lat), lon: parseFloat(suggestion.lon) });
    setShowSuggestions(false);
  };

  // Выбор места на карте
  const handleMapSelect = (lat: number, lon: number, address: string) => {
    setInputValue(address);
    onChange(address, lat, lon);
    setSelectedCoords({ lat, lon });
    setShowMap(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex gap-2">
        {/* Поле ввода адреса */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            placeholder={placeholder || 'Введите адрес...'}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00] focus:border-transparent"
          />
          
          {/* Индикатор загрузки */}
          {loading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#00CC00]"></div>
            </div>
          )}

          {/* Выпадающий список с подсказками */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-5 h-5 text-[#00CC00] flex-shrink-0 mt-0.5"
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
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {suggestion.display_name}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Кнопка открытия карты */}
        <button
          type="button"
          onClick={() => setShowMap(!showMap)}
          className="px-4 py-3 bg-[#00CC00] text-white rounded-xl hover:bg-[#00b300] transition-colors flex items-center gap-2"
          title="Выбрать на карте"
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
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <span className="hidden sm:inline">Карта</span>
        </button>
      </div>

      {/* Модальное окно с картой */}
      {showMap && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full flex flex-col" style={{ height: '80vh' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Выберите место на карте</h3>
              <button
                onClick={() => setShowMap(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 min-h-0" style={{ height: 'calc(80vh - 120px)' }}>
              <MapComponent
                onLocationSelect={handleMapSelect}
                initialCoords={selectedCoords}
              />
            </div>

            <div className="mt-4 text-sm text-gray-600">
              <p>💡 Кликните на карте, чтобы выбрать место</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
