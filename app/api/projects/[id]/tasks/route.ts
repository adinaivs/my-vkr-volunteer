import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { id } = await params;

    // Получаем проект, чтобы проверить владельца
    const project = await prisma.project.findUnique({
      where: { id },
      select: { organizerId: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });
    }

    // Проверяем, что пользователь - владелец проекта или администратор
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (project.organizerId !== session.userId && user?.role !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    // Получаем задачи проекта с информацией о назначениях
    const tasks = await prisma.task.findMany({
      where: { projectId: id },
      include: {
        skill: {
          select: {
            id: true,
            name: true,
          },
        },
        assignments: {
          where: {
            status: {
              in: ['assigned', 'completed', 'confirmed'],
            },
          },
          select: {
            id: true,
            volunteerId: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении задач' },
      { status: 500 }
    );
  }
}
