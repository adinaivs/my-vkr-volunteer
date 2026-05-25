import { NextRequest, NextResponse } from 'next/server';
import { getSession, getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/volunteer/calendar/events/[id] — обновить событие
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || session.role !== 'volunteer') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const { id } = await params;
    const event = await prisma.calendarEvent.findUnique({ where: { id } });

    if (!event || event.userId !== session.userId) {
      return NextResponse.json({ error: 'Событие не найдено' }, { status: 404 });
    }

    const body = await request.json();
    const { title, description, startDate, endDate, startTime, endTime, color, isAllDay, location } = body;

    const updated = await prisma.calendarEvent.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: new Date(endDate) }),
        ...(startTime !== undefined && { startTime: startTime || null }),
        ...(endTime !== undefined && { endTime: endTime || null }),
        ...(color !== undefined && { color }),
        ...(isAllDay !== undefined && { isAllDay }),
        ...(location !== undefined && { location: location?.trim() || null }),
      },
    });

    return NextResponse.json({ event: updated });
  } catch (error) {
    console.error('Ошибка обновления события:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// DELETE /api/volunteer/calendar/events/[id] — удалить событие
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || session.role !== 'volunteer') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const { id } = await params;
    const event = await prisma.calendarEvent.findUnique({ where: { id } });

    if (!event || event.userId !== session.userId) {
      return NextResponse.json({ error: 'Событие не найдено' }, { status: 404 });
    }

    await prisma.calendarEvent.delete({ where: { id } });

    return NextResponse.json({ message: 'Событие удалено' });
  } catch (error) {
    console.error('Ошибка удаления события:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
