'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Динамический импорт карты для избежания SSR проблем
const OpenStreetMap = dynamic(() => import('@/app/components/OpenStreetMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[450px] flex items-center justify-center bg-gray-100 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#00CC00] mx-auto"></div>
        <p className="mt-3 text-gray-600 text-sm">Загрузка карты...</p>
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
  const [showMapModal, setShowMapModal] = useState(false);

  // Блокировка скролла при открытии модального окна
  useEffect(() => {
    if (showMapModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showMapModal]);

  return (
    <>
      <div className="space-y-2">
        {/* Location Info */}
        <div className="text-gray-700">
          <span>{location}</span>
        </div>

        {/* Show Map Link */}
        <button
          onClick={() => setShowMapModal(true)}
          disabled={finalLatitude == null || finalLongitude == null}
          className="text-[#00CC00] text-sm font-medium hover:text-[#00b300] transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          Показать карту
        </button>
      </div>

      {/* Map Modal */}
      {showMapModal && finalLatitude != null && finalLongitude != null && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowMapModal(false)}
        >
          <div 
            className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Местоположение проекта</h3>
              <button
                onClick={() => setShowMapModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">{location}</p>

            <div className="mb-4">
              <OpenStreetMap
                latitude={finalLatitude}
                longitude={finalLongitude}
                location={location}
                height="350px"
              />
            </div>

            <a
              href={`https://www.openstreetmap.org/?mlat=${finalLatitude}&mlon=${finalLongitude}#map=15/${finalLatitude}/${finalLongitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#00CC00] text-white rounded-lg text-sm font-medium hover:bg-[#00b300] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Открыть в OpenStreetMap
            </a>
          </div>
        </div>
      )}
    </>
  );
}