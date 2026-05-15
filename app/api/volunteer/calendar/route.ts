import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/volunteer/calendar?year=2026&month=5
// Возвращает назначенные задачи (по дедлайну) + личные события для заданного года
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'volunteer') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()));
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null;

    // Диапазон дат: весь год или конкретный месяц ± буфер
    let startRange: Date;
    let endRange: Date;

    if (month !== null) {
      // Берём предыдущий, текущий и следующий месяц чтобы показать края
      startRange = new Date(year, month - 2, 1);
      endRange = new Date(year, month + 1, 31);
    } else {
      startRange = new Date(year - 1, 11, 1);
      endRange = new Date(year + 1, 0, 31);
    }

    // Назначенные задачи волонтёра
    const assignments = await prisma.taskAssignment.findMany({
      where: {
        volunteerId: session.userId,
        status: { notIn: ['cancelled', 'rejected'] },
        task: {
          deadline: {
            gte: startRange,
            lte: endRange,
          },
        },
      },
      include: {
        task: {
          include: {
            project: {
              select: { id: true, title: true, status: true },
            },
            skill: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Личные события пользователя из БД
    const personalEvents = await prisma.calendarEvent.findMany({
      where: {
        userId: session.userId,
        startDate: {
          gte: startRange,
          lte: endRange,
        },
      },
      include: {
        task: {
          select: { id: true, title: true },
        },
      },
    });

    // Преобразуем назначения задач в формат событий календаря
    const taskEvents = assignments.map((a) => ({
      id: `task-${a.id}`,
      type: 'task' as const,
      assignmentId: a.id,
      taskId: a.task.id,
      title: a.task.title,
      description: a.task.description,
      date: a.task.deadline.toISOString().split('T')[0],
      color: getTaskColor(a.status),
      status: a.status,
      taskStatus: a.task.status,
      project: a.task.project,
      skill: a.task.skill,
      isAllDay: true,
    }));

    // Личные события
    const personalFormatted = personalEvents.map((e) => ({
      id: e.id,
      type: 'personal' as const,
      title: e.title,
      description: e.description ?? undefined,
      date: e.startDate.toISOString().split('T')[0],
      endDate: e.endDate.toISOString().split('T')[0],
      startTime: e.startTime ?? undefined,
      endTime: e.endTime ?? undefined,
      color: e.color,
      isAllDay: e.isAllDay,
      location: e.location ?? undefined,
      linkedTaskId: e.taskId ?? undefined,
      linkedTask: e.task ?? undefined,
    }));

    return NextResponse.json({
      taskEvents,
      personalEvents: personalFormatted,
    });
  } catch (error) {
    console.error('Ошибка получения событий календаря:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

function getTaskColor(status: string): string {
  switch (status) {
    case 'confirmed':
    case 'completed': return '#2563eb';
    case 'assigned': return '#00CC00';
    default: return '#6b7280';
  }
}
