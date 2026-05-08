import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getCategoryInclude, formatCategoryWithTranslation } from '@/lib/category-helpers';

// GET - Получить список проектов для модерации
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Проверяем, что пользователь - администратор
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'moderation';

    const where: any = {};

    if (status === 'moderation') {
      where.status = 'moderation';
    } else if (status === 'recruiting') {
      where.status = { in: ['recruiting', 'upcoming', 'active'] };
    } else if (status === 'rejected') {
      where.status = 'rejected';
    }
    // Если status === 'all', не добавляем фильтр по статусу

    const projects = await prisma.project.findMany({
      where,
      include: {
        ...getCategoryInclude('ru'),
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            city: true,
            organizerProfile: {
              select: {
                organizationName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Форматируем категории с переводами
    const projectsWithTranslations = projects.map(project => ({
      ...project,
      category: formatCategoryWithTranslation(project.category)
    }));

    return NextResponse.json({ projects: projectsWithTranslations });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении списка проектов' },
      { status: 500 }
    );
  }
}
