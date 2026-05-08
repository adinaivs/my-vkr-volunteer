import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!['active', 'blocked'].includes(status)) {
      return NextResponse.json({ error: 'Недопустимый статус' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }
    if (user.role === 'admin') {
      return NextResponse.json({ error: 'Нельзя изменить статус администратора' }, { status: 403 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, status: true, firstName: true, lastName: true },
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error('Admin update user status error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
