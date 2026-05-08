import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE /api/organizer/projects/[id]/tasks/[taskId]/assignments/[volunteerId] - Отменить назначение задачи
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string; volunteerId: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      );
    }

    const { id: projectId, taskId, volunteerId } = await params;

    // Проверяем существование проекта и права доступа
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { organizerId: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Проект не найден' },
        { status: 404 }
      );
    }

    if (session.role !== 'admin' && project.organizerId !== session.userId) {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      );
    }

    // Проверяем существование назначения
    const assignment = await prisma.taskAssignment.findUnique({
      where: {
        taskId_volunteerId: {
          taskId,
          volunteerId,
        },
      },
      include: {
        task: {
          select: {
            projectId: true,
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'Назначение не найдено' },
        { status: 404 }
      );
    }

    // Проверяем, что задача принадлежит проекту
    if (assignment.task.projectId !== projectId) {
      return NextResponse.json(
        { error: 'Задача не принадлежит указанному проекту' },
        { status: 400 }
      );
    }

    // Нельзя отменить завершенные или подтвержденные задачи
    if (assignment.status === 'completed' || assignment.status === 'confirmed') {
      return NextResponse.json(
        { error: 'Нельзя отменить завершенную или подтвержденную задачу' },
        { status: 400 }
      );
    }

    // Отменяем назначение в транзакции
    const result = await prisma.$transaction(async (tx) => {
      // Обновляем статус назначения на cancelled (soft delete)
      const updatedAssignment = await tx.taskAssignment.update({
        where: {
          taskId_volunteerId: {
            taskId,
            volunteerId,
          },
        },
        data: {
          status: 'cancelled',
        },
      });

      // Уменьшаем счетчик волонтеров в задаче
      await tx.task.update({
        where: { id: taskId },
        data: {
          currentVolunteers: {
            decrement: 1,
          },
        },
      });

      return updatedAssignment;
    });

    return NextResponse.json({
      message: 'Назначение отменено',
      assignment: result,
    });
  } catch (error) {
    console.error('Error cancelling assignment:', error);
    return NextResponse.json(
      { error: 'Ошибка при отмене назначения' },
      { status: 500 }
    );
  }
}
