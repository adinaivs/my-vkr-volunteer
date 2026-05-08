import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getCategoryInclude, formatCategoryWithTranslation } from '@/lib/category-helpers';

// GET /api/volunteer/applications - Получить заявки волонтера
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Проверяем, что пользователь - волонтер
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user || user.role !== 'volunteer') {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'pending', 'approved', 'rejected'

    const where: any = {
      volunteerId: user.id,
    };

    if (status) {
      where.status = status;
    }

    // Получаем заявки волонтера
    const applications = await prisma.application.findMany({
      where,
      include: {
        project: {
          include: {
            ...getCategoryInclude('ru'),
            organizer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                organizerProfile: {
                  select: {
                    organizationName: true,
                  },
                },
              },
            },
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        appliedAt: 'desc',
      },
    });

    // Форматируем данные
    const applicationsData = applications.map(app => ({
      ...app,
      project: {
        ...app.project,
        latitude: app.project.latitude ? parseFloat(app.project.latitude.toString()) : null,
        longitude: app.project.longitude ? parseFloat(app.project.longitude.toString()) : null,
        category: formatCategoryWithTranslation(app.project.category),
      },
    }));

    return NextResponse.json({ applications: applicationsData });
  } catch (error) {
    console.error('Error fetching volunteer applications:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении заявок' },
      { status: 500 }
    );
  }
}
