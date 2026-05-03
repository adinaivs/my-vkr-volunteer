import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET - Получить текущее значение бесплатных публикаций
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      );
    }

    // Получаем настройку из базы
    const setting = await prisma.setting.findUnique({
      where: { key: 'default_free_posts' },
    });

    const defaultFreePosts = setting ? parseInt(setting.value) : 3;

    return NextResponse.json({ defaultFreePosts });
  } catch (error) {
    console.error('Error fetching free posts setting:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении настройки' },
      { status: 500 }
    );
  }
}

// PUT - Обновить количество бесплатных публикаций
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { defaultFreePosts } = body;

    // Валидация
    if (typeof defaultFreePosts !== 'number' || defaultFreePosts < 0) {
      return NextResponse.json(
        { error: 'Некорректное значение. Должно быть неотрицательное число' },
        { status: 400 }
      );
    }

    // Обновляем или создаем настройку
    const setting = await prisma.setting.upsert({
      where: { key: 'default_free_posts' },
      update: { value: defaultFreePosts.toString() },
      create: {
        key: 'default_free_posts',
        value: defaultFreePosts.toString(),
      },
    });

    return NextResponse.json({
      message: 'Настройка успешно обновлена',
      defaultFreePosts: parseInt(setting.value),
    });
  } catch (error) {
    console.error('Error updating free posts setting:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении настройки' },
      { status: 500 }
    );
  }
}
