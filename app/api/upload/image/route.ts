import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { uploadToS3, validateFile } from '@/lib/s3';

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthenticatedUser();
    if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'Файл не выбран' }, { status: 400 });
    }

    const validation = validateFile(file, 10, ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const imageUrl = await uploadToS3(file, 'project-images');

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ошибка при загрузке изображения' },
      { status: 500 }
    );
  }
}
