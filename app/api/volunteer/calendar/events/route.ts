import { NextRequest, NextResponse } from 'next/server';
import { getSession, getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/volunteer/calendar/events — создать личное событие или добавить задачу в календарь
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || session.role !== 'volunteer') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, startDate, endDate, startTime, endTime, color, isAllDay, location, taskId } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Название обязательно' }, { status: 400 });
    }
    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Даты обязательны' }, { status: 400 });
    }

    // Если добавляем задачу в календарь — проверяем что она назначена этому волонтёру
    if (taskId) {
      const assignment = await prisma.taskAssignment.findFirst({
        where: { taskId, volunteerId: session.userId },
      });
      if (!assignment) {
        return NextResponse.json({ error: 'Задача не найдена или не назначена вам' }, { status: 404 });
      }

      // Не создавать дубликат
      const existing = await prisma.calendarEvent.findFirst({
        where: { userId: session.userId, taskId },
      });
      if (existing) {
        return NextResponse.json({ error: 'Задача уже добавлена в календарь' }, { status: 409 });
      }
    }

    const event = await prisma.calendarEvent.create({
      data: {
        userId: session.userId,
        title: title.trim(),
        description: description?.trim() || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        startTime: startTime || null,
        endTime: endTime || null,
        color: color || '#00CC00',
        isAllDay: isAllDay ?? true,
        location: location?.trim() || null,
        taskId: taskId || null,
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error('Ошибка создания события:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
