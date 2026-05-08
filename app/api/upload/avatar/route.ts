import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadToS3, validateFile } from '@/lib/s3';

// POST /api/upload/avatar - Загрузить аватар пользователя
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });
    }

    const validation = validateFile(file, 3, ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const avatarUrl = await uploadToS3(file, 'avatars');

    await prisma.user.update({
      where: { id: session.userId },
      data: { avatarUrl },
    });

    return NextResponse.json({ success: true, avatarUrl });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json({ error: 'Ошибка при загрузке аватара' }, { status: 500 });
  }
}
