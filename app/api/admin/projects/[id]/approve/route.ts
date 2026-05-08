import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getCategoryInclude, formatCategoryWithTranslation } from '@/lib/category-helpers';

// POST - Одобрить проект
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Получаем проект
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        organizer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Проект не найден' },
        { status: 404 }
      );
    }

    // Проверяем, что проект на модерации
    if (project.status !== 'moderation') {
      return NextResponse.json(
        { error: 'Можно одобрять только проекты на модерации' },
        { status: 400 }
      );
    }

    // Получаем профиль организатора
    const organizerProfile = await prisma.organizerProfile.findUnique({
      where: { userId: project.organizerId },
    });

    if (!organizerProfile) {
      return NextResponse.json(
        { error: 'Профиль организатора не найден' },
        { status: 404 }
      );
    }

    // Одобряем проект
    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        status: 'recruiting', // Одобренный проект переходит в статус набора волонтеров
        publishedAt: new Date(),
        moderatedAt: new Date(),
        moderatedBy: user.id,
        rejectionReason: null, // Очищаем причину отклонения, если была
      },
      include: {
        ...getCategoryInclude('ru'),
        organizer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            organizerProfile: {
              select: {
                organizationName: true,
                freePostsRemaining: true,
              },
            },
          },
        },
      },
    });

    // Уменьшаем счетчик бесплатных публикаций только для бесплатных проектов
    if (!project.isPaid && organizerProfile.freePostsRemaining > 0) {
      await prisma.organizerProfile.update({
        where: { userId: project.organizerId },
        data: {
          freePostsRemaining: {
            decrement: 1,
          },
        },
      });
    }

    // TODO: Отправить уведомление организатору о публикации проекта
    console.log(`Проект "${project.title}" одобрен администратором ${user.email}`);

    return NextResponse.json({
      message: 'Проект успешно одобрен и опубликован',
      project: {
        ...updatedProject,
        category: formatCategoryWithTranslation(updatedProject.category)
      },
    });
  } catch (error) {
    console.error('Error approving project:', error);
    return NextResponse.json(
      { error: 'Ошибка при одобрении проекта' },
      { status: 500 }
    );
  }
}
