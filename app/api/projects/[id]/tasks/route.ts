import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, getAuthenticatedUser } from '@/lib/auth';
import { formatSkillWithTranslation } from '@/lib/category-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthenticatedUser();
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const locale = (searchParams.get('locale') || 'ru') as 'ru' | 'kg';

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
          include: {
            translations: {
              where: { locale },
            },
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
            report: {
              select: {
                id: true,
                submittedAt: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Форматируем навыки с переводами
    const formattedTasks = tasks.map(task => ({
      ...task,
      skill: task.skill ? formatSkillWithTranslation(task.skill) : null,
      requiredSkill: task.skill ? formatSkillWithTranslation(task.skill) : null,
    }));

    return NextResponse.json({ tasks: formattedTasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении задач' },
      { status: 500 }
    );
  }
}
