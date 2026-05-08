import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/organizer/projects/[id]/tasks/[taskId]/reports/[assignmentId] - Подтвердить или отклонить отчёт
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string; assignmentId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'organizer') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const { id: projectId, taskId, assignmentId } = await params;
    const body = await request.json();
    const { action, feedback, rating } = body;

    if (!action || !['confirm', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Неверное действие' }, { status: 400 });
    }

    // Проверяем, что проект принадлежит организатору
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });
    }

    if (project.organizerId !== session.userId) {
      return NextResponse.json({ error: 'Это не ваш проект' }, { status: 403 });
    }

    // Проверяем задание
    const assignment = await prisma.taskAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        task: true,
        report: true,
        volunteer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Задание не найдено' }, { status: 404 });
    }

    if (assignment.task.projectId !== projectId || assignment.taskId !== taskId) {
      return NextResponse.json({ error: 'Задание не принадлежит этому проекту' }, { status: 400 });
    }

    if (!assignment.report) {
      return NextResponse.json({ error: 'Отчёт не найден' }, { status: 404 });
    }

    if (assignment.status === 'confirmed') {
      return NextResponse.json({ error: 'Задание уже подтверждено' }, { status: 400 });
    }

    if (assignment.status !== 'assigned' || !assignment.report) {
      return NextResponse.json({ error: 'Отчёт ещё не отправлен' }, { status: 400 });
    }

    if (action === 'confirm') {
      // Подтверждаем выполнение
      if (rating && (rating < 1 || rating > 5)) {
        return NextResponse.json({ error: 'Рейтинг должен быть от 1 до 5' }, { status: 400 });
      }

      const updatedAssignment = await prisma.taskAssignment.update({
        where: { id: assignmentId },
        data: {
          status: 'confirmed',
          confirmedAt: new Date(),
          feedback: feedback || null,
          rating: rating || null,
        },
        include: {
          volunteer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          task: {
            select: {
              id: true,
              title: true,
            },
          },
          report: true,
        },
      });

      // Обновляем статистику волонтёра
      await prisma.volunteerProfile.update({
        where: { userId: assignment.volunteerId },
        data: {
          completedTasks: {
            increment: 1,
          },
        },
      });

      return NextResponse.json({
        message: 'Выполнение задачи подтверждено',
        assignment: updatedAssignment,
      });
    } else {
      // Отклоняем выполнение
      if (!feedback || !feedback.trim()) {
        return NextResponse.json({ error: 'Укажите причину отклонения' }, { status: 400 });
      }

      const updatedAssignment = await prisma.taskAssignment.update({
        where: { id: assignmentId },
        data: {
          status: 'rejected',
          feedback,
          completedAt: null,
        },
        include: {
          volunteer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          task: {
            select: {
              id: true,
              title: true,
            },
          },
          report: true,
        },
      });

      return NextResponse.json({
        message: 'Отчёт отклонён',
        assignment: updatedAssignment,
      });
    }
  } catch (error) {
    console.error('Ошибка при обработке отчёта:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
