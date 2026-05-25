import { NextRequest, NextResponse } from 'next/server';
import { getSession, getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/volunteer/tasks/[assignmentId]/report - Отправить отчёт о выполнении задачи
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || session.role !== 'volunteer') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const { assignmentId } = await params;
    const body = await request.json();
    const { description, photos } = body;

    if (!description || !description.trim()) {
      return NextResponse.json({ error: 'Описание обязательно' }, { status: 400 });
    }

    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return NextResponse.json({ error: 'Необходимо загрузить хотя бы одну фотографию' }, { status: 400 });
    }

    // Проверяем, что задание существует и принадлежит волонтёру
    const assignment = await prisma.taskAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        task: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Задание не найдено' }, { status: 404 });
    }

    if (assignment.volunteerId !== session.userId) {
      return NextResponse.json({ error: 'Это не ваше задание' }, { status: 403 });
    }

    if (assignment.status === 'confirmed') {
      return NextResponse.json({ error: 'Задание уже подтверждено' }, { status: 400 });
    }

    if (assignment.status === 'cancelled' || assignment.status === 'rejected') {
      return NextResponse.json({ error: 'Задание отменено или отклонено' }, { status: 400 });
    }

    // Проверяем статус проекта - отчёт можно отправлять только для активных проектов
    const projectStatus = assignment.task.project.status;
    if (projectStatus !== 'active') {
      return NextResponse.json({ 
        error: 'Отчёт можно отправлять только для активных проектов' 
      }, { status: 400 });
    }

    // Проверяем, есть ли уже отчёт
    const existingReport = await prisma.taskReport.findUnique({
      where: { assignmentId },
    });

    if (existingReport) {
      // Обновляем существующий отчёт
      const updatedReport = await prisma.taskReport.update({
        where: { assignmentId },
        data: {
          description,
          photos,
        },
      });

      return NextResponse.json({
        message: 'Отчёт обновлён',
        report: updatedReport,
      });
    }

    // Создаём отчёт и переводим задание в статус "completed" (ожидает подтверждения)
    const [report] = await prisma.$transaction([
      prisma.taskReport.create({
        data: {
          assignmentId,
          description,
          photos,
        },
      }),
      prisma.taskAssignment.update({
        where: { id: assignmentId },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      }),
    ]);

    return NextResponse.json({
      message: 'Отчёт отправлен на проверку',
      report,
    });
  } catch (error) {
    console.error('Ошибка при отправке отчёта:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}

// GET /api/volunteer/tasks/[assignmentId]/report - Получить отчёт
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || session.role !== 'volunteer') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const { assignmentId } = await params;

    // Проверяем, что задание принадлежит волонтёру
    const assignment = await prisma.taskAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Задание не найдено' }, { status: 404 });
    }

    if (assignment.volunteerId !== session.userId) {
      return NextResponse.json({ error: 'Это не ваше задание' }, { status: 403 });
    }

    // Получаем отчёт
    const report = await prisma.taskReport.findUnique({
      where: { assignmentId },
    });

    if (!report) {
      return NextResponse.json({ error: 'Отчёт не найден' }, { status: 404 });
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Ошибка при получении отчёта:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
