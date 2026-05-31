import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { uploadToS3 } from '@/lib/s3';

const ALLOWED_TYPES = [
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/ogg',
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
];
const MAX_SIZE_MB = 10;

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthenticatedUser();
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('audio') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Аудио файл не найден' }, { status: 400 });
    }

    // Проверка размера
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `Размер файла не должен превышать ${MAX_SIZE_MB} МБ` },
        { status: 400 }
      );
    }

    // Проверка типа (мягкая — браузеры могут давать разные MIME)
    const baseType = file.type.split(';')[0].trim();
    if (!ALLOWED_TYPES.some(t => t.startsWith(baseType)) && !baseType.startsWith('audio/')) {
      return NextResponse.json({ error: 'Разрешены только аудио файлы' }, { status: 400 });
    }

    const audioUrl = await uploadToS3(file, 'voice-messages');

    return NextResponse.json({ audioUrl });
  } catch (error) {
    console.error('Audio upload error:', error);
    return NextResponse.json(
      { error: 'Ошибка при загрузке аудио', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
