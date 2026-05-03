import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// POST - Опубликовать проект (отправить на модерацию)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Проверяем, что пользователь - организатор
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        organizerProfile: true,
      },
    });

    if (!user || user.role !== 'organizer') {
      return NextResponse.json(
        { error: 'Только организаторы могут публиковать проекты' },
        { status: 403 }
      );
    }

    // КРИТИЧЕСКАЯ ПРОВЕРКА: Организатор должен быть подтвержден админом
    if (!user.organizerProfile?.isApprovedByAdmin) {
      return NextResponse.json(
        {
          error: 'Ваш аккаунт еще не подтвержден администратором',
          message:
            'Для публикации проектов необходимо дождаться подтверждения вашего аккаунта администратором. Обычно это занимает 1-2 рабочих дня.',
          code: 'ORGANIZER_NOT_APPROVED',
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Получаем проект
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });
    }

    // Проверяем, что проект принадлежит текущему пользователю
    if (project.organizerId !== user.id) {
      return NextResponse.json(
        { error: 'У вас нет прав на публикацию этого проекта' },
        { status: 403 }
      );
    }

    // Проверяем статус проекта
    if (project.status !== 'draft') {
      return NextResponse.json(
        { error: 'Можно публиковать только черновики' },
        { status: 400 }
      );
    }

    // Обновляем статус проекта на "moderation"
    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        status: 'moderation',
      },
      include: {
        category: true,
        organizer: {
          select: {
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
    });

    return NextResponse.json({
      message: 'Проект отправлен на модерацию',
      project: updatedProject,
    });
  } catch (error) {
    console.error('Error publishing project:', error);
    return NextResponse.json(
      { error: 'Ошибка при публикации проекта' },
      { status: 500 }
    );
  }
}
