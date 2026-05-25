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
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId') || '';
    const sortBy = searchParams.get('sortBy') || 'date-desc';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    const singleStatuses = ['moderation', 'rejected', 'active', 'completed', 'cancelled', 'blocked', 'upcoming'];
    if (status === 'recruiting') {
      where.status = { in: ['recruiting', 'upcoming'] };
    } else if (singleStatuses.includes(status)) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { organizer: { firstName: { contains: search, mode: 'insensitive' } } },
        { organizer: { lastName: { contains: search, mode: 'insensitive' } } },
        { organizer: { organizerProfile: { organizationName: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    let orderBy: any = { createdAt: 'desc' };
    switch (sortBy) {
      case 'date-asc': orderBy = { createdAt: 'asc' }; break;
      case 'name-asc': orderBy = { title: 'asc' }; break;
      case 'name-desc': orderBy = { title: 'desc' }; break;
      default: orderBy = { createdAt: 'desc' };
    }

    const include = {
      ...getCategoryInclude('ru'),
      organizer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          city: true,
          organizerProfile: { select: { organizationName: true } },
        },
      },
    };

    const [total, projects] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({ where, include, orderBy, skip, take: limit }),
    ]);

    const projectsWithTranslations = projects.map(project => ({
      ...project,
      category: formatCategoryWithTranslation(project.category)
    }));

    return NextResponse.json({
      projects: projectsWithTranslations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении списка проектов' },
      { status: 500 }
    );
  }
}
