import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ProjectStatus } from '@prisma/client';

// Допустимые переходы между статусами
const ALLOWED_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  draft: ['moderation'],
  moderation: ['recruiting', 'rejected'],
  rejected: ['moderation'],
  recruiting: ['upcoming', 'cancelled'],
  upcoming: ['active', 'cancelled'],
  active: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  blocked: [],
};

// PATCH /api/organizer/projects/[id]/status - Изменить статус проекта
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;
    const body = await request.json();
    const { newStatus } = body;

    if (!newStatus) {
      return NextResponse.json(
        { error: 'Не указан новый статус' },
        { status: 400 }
      );
    }

    // Проверяем валидность статуса
    const validStatuses: ProjectStatus[] = [
      'draft',
      'moderation',
      'rejected',
      'recruiting',
      'upcoming',
      'active',
      'completed',
      'cancelled',
      'blocked',
    ];

    if (!validStatuses.includes(newStatus as ProjectStatus)) {
      return NextResponse.json(
        { error: 'Недопустимый статус', allowedStatuses: validStatuses },
        { status: 400 }
      );
    }

    // Получаем проект
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: {
          select: {
            id: true,
            status: true,
          },
        },
        participants: {
          where: {
            isActive: true,
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

    // Проверяем права доступа
    if (session.role !== 'admin' && project.organizerId !== session.userId) {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      );
    }

    // Проверяем допустимость перехода
    const allowedTransitions = ALLOWED_TRANSITIONS[project.status];
    if (!allowedTransitions.includes(newStatus as ProjectStatus)) {
      return NextResponse.json(
        {
          error: 'Недопустимый переход статуса',
          currentStatus: project.status,
          allowedTransitions,
        },
        { status: 400 }
      );
    }

    // Валидация для перехода recruiting -> upcoming
    if (project.status === 'recruiting' && newStatus === 'upcoming') {
      if (project.participants.length === 0) {
        return NextResponse.json(
          { error: 'Нельзя перейти в статус "Скоро начнется" без участников' },
          { status: 400 }
        );
      }
    }

    // Валидация для перехода upcoming -> active
    if (project.status === 'upcoming' && newStatus === 'active') {
      const currentDate = new Date();
      const startDate = new Date(project.startDate);
      
      if (startDate > currentDate) {
        return NextResponse.json(
          { error: 'Нельзя перейти в статус "Активный" до даты начала проекта' },
          { status: 400 }
        );
      }
    }

    // Валидация для перехода active -> completed
    if (project.status === 'active' && newStatus === 'completed') {
      const hasIncompleteTasks = project.tasks.some(
        (task) => task.status !== 'completed' && task.status !== 'cancelled'
      );

      if (hasIncompleteTasks) {
        return NextResponse.json(
          { error: 'Нельзя завершить проект, пока не завершены все задачи' },
          { status: 400 }
        );
      }
    }

    // Обновляем статус проекта
    const result = await prisma.$transaction(async (tx) => {
      // Если переходим в cancelled, отменяем все pending назначения
      if (newStatus === 'cancelled') {
        await tx.taskAssignment.updateMany({
          where: {
            task: {
              projectId,
            },
            status: 'assigned',
          },
          data: {
            status: 'cancelled',
          },
        });
      }

      // Обновляем статус проекта
      const updatedProject = await tx.project.update({
        where: { id: projectId },
        data: {
          status: newStatus as ProjectStatus,
          updatedAt: new Date(),
        },
        include: {
          category: {
            include: {
              translations: {
                where: {
                  locale: 'ru',
                },
              },
            },
          },
          organizer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          participants: {
            where: { isActive: true },
            select: { volunteerId: true },
          },
        },
      });

      return updatedProject;
    });

    // При переходе recruiting -> upcoming создаём групповой чат
    // Выполняется отдельно от транзакции после применения миграции
    if (project.status === 'recruiting' && newStatus === 'upcoming') {
      try {
        const existingChat = await (prisma as any).projectChat.findUnique({
          where: { projectId },
        });

        if (!existingChat) {
          const chat = await (prisma as any).projectChat.create({
            data: { projectId, name: result.title },
          });

          const memberIds = [
            result.organizer.id,
            ...result.participants.map((p: { volunteerId: string }) => p.volunteerId),
          ];
          const uniqueIds = [...new Set(memberIds)];

          await (prisma as any).projectChatMember.createMany({
            data: uniqueIds.map((userId) => ({ chatId: chat.id, userId })),
            skipDuplicates: true,
          });

          await (prisma as any).projectChatMessage.create({
            data: {
              chatId: chat.id,
              senderId: result.organizer.id,
              content: `Добро пожаловать в групповой чат проекта «${result.title}»! Набор завершён, проект скоро начнётся.`,
            },
          });
        }
      } catch (chatError) {
        // Чат не создан (миграция ещё не применена), статус уже обновлён
        console.warn('Не удалось создать чат (применить миграцию):', chatError);
      }
    }

    return NextResponse.json({
      message: 'Статус проекта обновлен',
      project: result,
    });
  } catch (error) {
    console.error('Error updating project status:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении статуса проекта' },
      { status: 500 }
    );
  }
}
