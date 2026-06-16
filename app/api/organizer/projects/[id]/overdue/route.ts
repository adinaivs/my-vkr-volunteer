import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { penalizeOverdueAssignments } from '@/lib/overdue-penalty';

// POST /api/organizer/projects/[id]/overdue
// Помечает просроченные задачи проекта как overdue и уведомляет организатора.
// Вызывается автоматически при открытии страницы проекта, если endDate прошёл.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthenticatedUser();
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { id: projectId } = await params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: {
          where: { status: { in: ['pending', 'in_progress'] } },
          select: { id: true, title: true, deadline: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });
    }

    // Проверяем права: только организатор проекта или админ
    if (session.role !== 'admin' && project.organizerId !== session.userId) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    // Только активные проекты у которых прошёл срок
    if (project.status !== 'active') {
      return NextResponse.json({ overdueCount: 0, alreadyDone: true });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(project.endDate);
    endDate.setHours(0, 0, 0, 0);

    if (endDate >= today) {
      return NextResponse.json({ overdueCount: 0, alreadyDone: false, notExpired: true });
    }

    const overdueTasks = project.tasks; // уже отфильтрованы: pending | in_progress

    if (overdueTasks.length === 0) {
      return NextResponse.json({ overdueCount: 0, alreadyDone: true });
    }

    const overdueTaskIds = overdueTasks.map(t => t.id);

    // Помечаем задачи как просроченные и штрафуем незакрытые назначения в транзакции
    await prisma.$transaction(async (tx) => {
      // Задачи → overdue
      await tx.task.updateMany({
        where: { id: { in: overdueTaskIds } },
        data: { status: 'overdue' },
      });

      // Назначения assigned → cancelled, 0 звёзд, пересчёт рейтинга
      await penalizeOverdueAssignments(tx, overdueTaskIds);
    });

    return NextResponse.json({
      overdueCount: overdueTasks.length,
      overdueTasks: overdueTasks.map(t => t.title),
    });
  } catch (error) {
    console.error('Ошибка при обработке просроченных задач:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

function getTaskWord(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'задача';
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'задачи';
  return 'задач';
}
