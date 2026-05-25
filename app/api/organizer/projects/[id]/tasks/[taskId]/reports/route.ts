import { NextRequest, NextResponse } from 'next/server';
import { getSession, getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/organizer/projects/[id]/tasks/[taskId]/reports - Получить все отчёты по задаче
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || session.role !== 'organizer') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const { id: projectId, taskId } = await params;

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

    // Проверяем, что задача принадлежит проекту
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task || task.projectId !== projectId) {
      return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 });
    }

    // Получаем все назначения с отчётами
    const assignments = await prisma.taskAssignment.findMany({
      where: {
        taskId,
        status: {
          in: ['assigned', 'confirmed', 'rejected'],
        },
        report: {
          isNot: null,
        },
      },
      include: {
        volunteer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            email: true,
            phone: true,
          },
        },
        report: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error('Ошибка при получении отчётов:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
