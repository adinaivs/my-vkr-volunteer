import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/organizer/projects/[id]/auto-activate
// Автоматически переводит проект из upcoming → active при выполнении всех условий:
//   1. startDate <= сегодня
//   2. Все задачи (кроме отменённых) имеют хотя бы одного назначенного волонтёра
// Вызывается при открытии страницы проекта или списка проектов.
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
          select: {
            id: true,
            title: true,
            status: true,
            currentVolunteers: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });
    }

    if (session.role !== 'admin' && project.organizerId !== session.userId) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    // Только upcoming проекты
    if (project.status !== 'upcoming') {
      return NextResponse.json({ activated: false, reason: 'not_upcoming' });
    }

    // Условие 1: дата начала наступила
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(project.startDate);
    startDate.setHours(0, 0, 0, 0);

    if (startDate > today) {
      return NextResponse.json({
        activated: false,
        reason: 'start_date_not_reached',
        startDate: project.startDate,
      });
    }

    // Условие 2: все задачи (кроме отменённых) имеют хотя бы одного волонтёра
    const unassignedTasks = project.tasks.filter(
      t => t.status !== 'cancelled' && t.currentVolunteers < 1
    );

    if (unassignedTasks.length > 0) {
      return NextResponse.json({
        activated: false,
        reason: 'unassigned_tasks',
        unassignedCount: unassignedTasks.length,
        unassignedTasks: unassignedTasks.map(t => t.title),
      });
    }

    // Все условия выполнены — переводим в active
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'active', updatedAt: new Date() },
    });

    return NextResponse.json({ activated: true });
  } catch (error) {
    console.error('Ошибка при авто-активации проекта:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
