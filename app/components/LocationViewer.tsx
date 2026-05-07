'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

// Динамический импорт карты для избежания SSR проблем
const OpenStreetMap = dynamic(() => import('@/app/components/OpenStreetMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[300px] flex items-center justify-center bg-gray-100 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00CC00] mx-auto"></div>
        <p className="mt-2 text-gray-600 text-sm">Загрузка карты...</p>
      </div>
    </div>
  )
});

interface LocationViewerProps {
  latitude?: number;
  longitude?: number;
  lat?: number;
  lon?: number;
  location: string;
}

export default function LocationViewer({ latitude, longitude, lat, lon, location }: LocationViewerProps) {
  // Используем lat/lon если они переданы, иначе latitude/longitude
  const finalLatitude = lat ?? latitude;
  const finalLongitude = lon ?? longitude;
  const [showMap, setShowMap] = useState(false);

  const openInMaps = () => {
    // Проверяем что координаты определены
    if (finalLatitude == null || finalLongitude == null) {
      console.warn('Координаты не определены');
      return;
    }
    // Открываем в OpenStreetMap
    const url = `https://www.openstreetmap.org/?mlat=${finalLatitude}&mlon=${finalLongitude}#map=15/${finalLatitude}/${finalLongitude}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-3">
      {/* Location Info */}
      <div className="flex items-center gap-2 text-gray-700">
        <svg className="w-5 h-5 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span>{location}</span>
      </div>

      {/* Coordinates */}
      {finalLatitude != null && finalLongitude != null && (
        <div className="text-sm text-gray-600">
          Координаты: {finalLatitude.toFixed(6)}, {finalLongitude.toFixed(6)}
        </div>
      )}

      {/* Map Actions */}
      <div className="flex gap-2">
        <button
          onClick={openInMaps}
          disabled={finalLatitude == null || finalLongitude == null}
          className="px-4 py-2 bg-[#00CC00] text-white rounded-lg text-sm font-medium hover:bg-[#00b300] transition-colors flex items-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Открыть в OpenStreetMap
        </button>
        
        <button
          onClick={() => setShowMap(!showMap)}
          disabled={finalLatitude == null || finalLongitude == null}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          {showMap ? 'Скрыть карту' : 'Показать карту'}
        </button>
      </div>

      {/* Embedded Map */}
      {showMap && finalLatitude != null && finalLongitude != null && (
        <div className="mt-4">
          <OpenStreetMap
            latitude={finalLatitude}
            longitude={finalLongitude}
            location={location}
            height="300px"
          />
        </div>
      )}
    </div>
  );
}