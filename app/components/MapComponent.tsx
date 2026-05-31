'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Исправление иконок маркеров Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapComponentProps {
  onLocationSelect: (lat: number, lon: number, address: string) => void;
  initialCoords?: { lat: number; lon: number } | null;
}

// Компонент для обработки кликов на карте
function LocationMarker({ onLocationSelect }: { onLocationSelect: (lat: number, lon: number) => void }) {
  const [position, setPosition] = useState<L.LatLng | null>(null);

  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  return position === null ? null : <Marker position={position} />;
}

export default function MapComponent({ onLocationSelect, initialCoords }: MapComponentProps) {
  const [selectedPosition, setSelectedPosition] = useState<{ lat: number; lon: number } | null>(
    initialCoords || null
  );
  const [address, setAddress] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Центр карты - Бишкек по умолчанию
  const defaultCenter: [number, number] = [42.8746, 74.5698];
  const center: [number, number] = initialCoords
    ? [initialCoords.lat, initialCoords.lon]
    : defaultCenter;

  // Получение адреса по координатам (обратное геокодирование)
  const getAddressFromCoords = async (lat: number, lon: number) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/geocode/reverse?lat=${lat}&lon=${lon}`
      );

      if (response.ok) {
        const data = await response.json();
        const addressText = data.display_name || `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
        setAddress(addressText);
        return addressText;
      }
    } catch (error) {
      console.error('Ошибка получения адреса:', error);
    } finally {
      setLoading(false);
    }
    return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  };

  // Обработка выбора места на карте
  const handleLocationClick = async (lat: number, lon: number) => {
    setSelectedPosition({ lat, lon });
    const addressText = await getAddressFromCoords(lat, lon);
    onLocationSelect(lat, lon, addressText);
  };

  // Загрузка адреса для начальных координат
  useEffect(() => {
    if (initialCoords) {
      getAddressFromCoords(initialCoords.lat, initialCoords.lon);
    }
  }, [initialCoords]);

  return (
    <div className="h-full w-full flex flex-col">
      {/* Карта */}
      <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: selectedPosition ? 'calc(100% - 120px)' : '100%' }}>
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker onLocationSelect={handleLocationClick} />
          {selectedPosition && (
            <Marker position={[selectedPosition.lat, selectedPosition.lon]} />
          )}
        </MapContainer>
      </div>

      {/* Информация о выбранном месте */}
      {selectedPosition && (
        <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-start gap-3">
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
              <div className="text-sm font-medium text-gray-900 mb-1">Выбранное место:</div>
              {loading ? (
                <div className="text-sm text-gray-600">Загрузка адреса...</div>
              ) : (
                <div className="text-sm text-gray-600">{address}</div>
              )}
              <div className="text-xs text-gray-500 mt-1">
                Координаты: {selectedPosition.lat.toFixed(6)}, {selectedPosition.lon.toFixed(6)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
