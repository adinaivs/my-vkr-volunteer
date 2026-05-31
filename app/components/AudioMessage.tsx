'use client';

import { useState, useRef, useEffect } from 'react';

interface AudioMessageProps {
  src: string;
  isMine?: boolean;
}

export default function AudioMessage({ src, isMine = false }: AudioMessageProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Флаг: идёт ли сейчас "невидимый" seek для определения длины
  const discoveringRef = useRef(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Трюк для WebM от MediaRecorder: браузер не знает длину заранее (duration=Infinity).
    // Seekнуть к очень большому числу → браузер вычислит реальный конец → узнаём duration.
    const discoverDuration = () => {
      if (!isFinite(audio.duration)) {
        discoveringRef.current = true;
        const onSeeked = () => {
          audio.removeEventListener('seeked', onSeeked);
          if (isFinite(audio.duration) && audio.duration > 0) {
            setDuration(audio.duration);
          }
          audio.currentTime = 0;
          discoveringRef.current = false;
        };
        audio.addEventListener('seeked', onSeeked);
        audio.currentTime = 1e10;
      }
    };

    const onLoadedMetadata = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      } else {
        discoverDuration();
      }
      setLoading(false);
    };

    const onTimeUpdate = () => {
      if (!discoveringRef.current) {
        setCurrentTime(audio.currentTime);
      }
    };

    const onEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
      // На случай если duration всё ещё не определён
      if (!isFinite(audio.duration)) {
        discoverDuration();
      }
    };

    const onError = () => { setError(true); setLoading(false); };
    const onCanPlay = () => setLoading(false);

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.addEventListener('canplay', onCanPlay);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('canplay', onCanPlay);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || discoveringRef.current) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().catch(() => setError(true));
      setPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio || discoveringRef.current) return;
    const t = parseFloat(e.target.value);
    audio.currentTime = t;
    setCurrentTime(t);
  };

  const fmt = (s: number) => {
    if (!isFinite(s) || s <= 0) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const bars = [3, 5, 8, 6, 10, 7, 4, 9, 6, 5, 8, 4, 7, 9, 5, 6, 8, 4, 6, 7];

  if (error) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${isMine ? 'text-green-200' : 'text-gray-500'}`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Ошибка воспроизведения
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 w-full min-w-[200px] max-w-[260px]">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Кнопка play/pause */}
      <button
        onClick={togglePlay}
        disabled={loading}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
          isMine
            ? 'bg-white/25 hover:bg-white/40 text-white'
            : 'bg-[#00CC00] hover:bg-[#00b300] text-white'
        } disabled:opacity-50`}
      >
        {loading ? (
          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        ) : playing ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7L8 5z" />
          </svg>
        )}
      </button>

      {/* Волны + прогресс */}
      <div className="flex-1 flex flex-col gap-1">
        {/* Декоративные полоски */}
        <div className="flex items-end gap-[2px] h-6 overflow-hidden">
          {bars.map((h, i) => {
            const barProgress = (i / bars.length) * 100;
            const isPassed = progress > barProgress;
            return (
              <div
                key={i}
                className={`w-[3px] rounded-full transition-colors ${
                  isPassed
                    ? isMine ? 'bg-white' : 'bg-[#00CC00]'
                    : isMine ? 'bg-white/40' : 'bg-gray-300'
                }`}
                style={{ height: `${Math.round((h / 10) * 100)}%` }}
              />
            );
          })}
        </div>

        {/* Ползунок + время */}
        <div className="flex items-center gap-1.5">
          <input
            type="range"
            min={0}
            max={duration > 0 ? duration : 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${
                isMine ? 'rgba(255,255,255,0.9)' : '#00CC00'
              } ${progress}%, ${
                isMine ? 'rgba(255,255,255,0.3)' : '#e5e7eb'
              } ${progress}%)`,
            }}
          />
          <span className={`text-[10px] font-medium shrink-0 tabular-nums w-8 text-right ${isMine ? 'text-white/80' : 'text-gray-500'}`}>
            {playing || currentTime > 0 ? fmt(currentTime) : fmt(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
