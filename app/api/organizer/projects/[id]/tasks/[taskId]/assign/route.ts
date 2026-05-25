import { NextRequest, NextResponse } from 'next/server';
import { getSession, getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/organizer/projects/[id]/tasks/[taskId]/assign - Назначить задачу участнику
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const session = await getAuthenticatedUser();

    if (!session) {
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      );
    }

    const { id: projectId, taskId } = await params;
    const body = await request.json();
    const { volunteerId } = body;

    if (!volunteerId) {
      return NextResponse.json(
        { error: 'Не указан ID волонтера' },
        { status: 400 }
      );
    }

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

    // Проверяем существование задачи и что она принадлежит проекту
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { projectId: true, currentVolunteers: true, requiredVolunteers: true },
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Задача не найдена' },
        { status: 404 }
      );
    }

    if (task.projectId !== projectId) {
      return NextResponse.json(
        { error: 'Задача не принадлежит указанному проекту' },
        { status: 400 }
      );
    }

    // Проверяем, что волонтер является активным участником проекта
    const participant = await prisma.projectParticipant.findUnique({
      where: {
        projectId_volunteerId: {
          projectId,
          volunteerId,
        },
      },
    });

    if (!participant || !participant.isActive) {
      return NextResponse.json(
        { error: 'Волонтер не является участником проекта' },
        { status: 400 }
      );
    }

    // Проверяем, что задача еще не назначена этому волонтеру (проверяем только активные назначения)
    const existingAssignment = await prisma.taskAssignment.findUnique({
      where: {
        taskId_volunteerId: {
          taskId,
          volunteerId,
        },
      },
    });

    // Если есть активное назначение (не отмененное и не отклоненное), то нельзя назначить снова
    if (existingAssignment && existingAssignment.status !== 'cancelled' && existingAssignment.status !== 'rejected') {
      return NextResponse.json(
        { error: 'Задача уже назначена этому волонтеру' },
        { status: 400 }
      );
    }

    // Создаем назначение задачи в транзакции
    const result = await prisma.$transaction(async (tx) => {
      let assignment;
      
      // Если есть отмененное или отклоненное назначение, обновляем его
      if (existingAssignment && (existingAssignment.status === 'cancelled' || existingAssignment.status === 'rejected')) {
        assignment = await tx.taskAssignment.update({
          where: {
            taskId_volunteerId: {
              taskId,
              volunteerId,
            },
          },
          data: {
            status: 'assigned',
            assignedBy: session.userId,
            completedAt: null,
            confirmedAt: null,
            feedback: null,
            rating: null,
          },
          include: {
            volunteer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            task: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        });
      } else {
        // Создаем новое назначение
        assignment = await tx.taskAssignment.create({
          data: {
            taskId,
            volunteerId,
            assignedBy: session.userId,
            status: 'assigned',
          },
          include: {
            volunteer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            task: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        });
      }

      // Обновляем счетчик волонтеров в задаче
      const updatedTask = await tx.task.update({
        where: { id: taskId },
        data: {
          currentVolunteers: {
            increment: 1,
          },
        },
      });

      // Если набрано достаточно волонтеров, меняем статус задачи
      if (updatedTask.currentVolunteers >= updatedTask.requiredVolunteers) {
        await tx.task.update({
          where: { id: taskId },
          data: {
            status: 'in_progress',
          },
        });
      }

      return assignment;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error assigning task:', error);
    return NextResponse.json(
      { error: 'Ошибка при назначении задачи' },
      { status: 500 }
    );
  }
}
