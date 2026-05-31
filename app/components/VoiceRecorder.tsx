'use client';

import { useState, useRef, useEffect } from 'react';

interface VoiceRecorderProps {
  onSend: (audioUrl: string) => void;
  disabled?: boolean;
}

type RecordingState = 'idle' | 'recording' | 'uploading';

export default function VoiceRecorder({ onSend, disabled = false }: VoiceRecorderProps) {
  const [state, setState] = useState<RecordingState>('idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      stopTimer();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Выбираем поддерживаемый формат
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;

        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];

        if (blob.size < 1000) {
          // Слишком короткая запись
          setState('idle');
          setSeconds(0);
          return;
        }

        setState('uploading');

        try {
          const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : 'webm';
          const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: mimeType });

          const form = new FormData();
          form.append('audio', file);

          const res = await fetch('/api/upload/audio', { method: 'POST', body: form });
          const data = await res.json();

          if (!res.ok) {
            setError(data.error || 'Ошибка загрузки');
            setState('idle');
            setSeconds(0);
            return;
          }

          onSend(data.audioUrl);
        } catch (err) {
          setError('Ошибка при отправке голосового сообщения');
        } finally {
          setState('idle');
          setSeconds(0);
        }
      };

      recorder.start(250); // Кусочки каждые 250 мс
      setState('recording');

      // Таймер
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);

    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Разрешите доступ к микрофону в настройках браузера');
      } else {
        setError('Не удалось получить доступ к микрофону');
      }
    }
  };

  const stopRecording = () => {
    stopTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    stopTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      // Помечаем как отмену, чтобы onstop не загружал
      chunksRef.current = [];
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setState('idle');
    setSeconds(0);
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // ── РЕЖИМ ЗАПИСИ ──────────────────────────────────────────────
  if (state === 'recording') {
    return (
      <div className="flex items-center gap-2 flex-1">
        {/* Мигающий индикатор */}
        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
        <span className="text-sm font-medium text-red-600 tabular-nums">{fmt(seconds)}</span>
        <span className="text-xs text-gray-500">Запись...</span>

        <div className="flex-1" />

        {/* Отмена */}
        <button
          type="button"
          onClick={cancelRecording}
          className="p-2 text-gray-400 hover:text-red-500 rounded-xl hover:bg-red-50 transition-colors"
          title="Отменить"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Отправить */}
        <button
          type="button"
          onClick={stopRecording}
          className="w-10 h-10 bg-[#00CC00] text-white rounded-xl flex items-center justify-center hover:bg-[#00b300] transition-colors shrink-0"
          title="Отправить"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>
    );
  }

  // ── РЕЖИМ ЗАГРУЗКИ ─────────────────────────────────────────────
  if (state === 'uploading') {
    return (
      <div className="flex items-center gap-2 flex-1">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#00CC00] border-t-transparent shrink-0" />
        <span className="text-xs text-gray-500">Отправка...</span>
      </div>
    );
  }

  // ── РЕЖИМ ОЖИДАНИЯ ─────────────────────────────────────────────
  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={startRecording}
        disabled={disabled}
        className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-[#00CC00] hover:bg-green-50 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        title="Голосовое сообщение"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </button>
      {error && (
        <p className="text-[10px] text-red-500 max-w-[160px] text-right leading-tight">{error}</p>
      )}
    </div>
  );
}
