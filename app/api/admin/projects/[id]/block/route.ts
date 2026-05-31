import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/admin/projects/[id]/block
// Блокирует проект. Запоминает текущий статус для последующего разблокирования.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const admin = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { reason } = body;

    if (!reason?.trim()) {
      return NextResponse.json({ error: 'Необходимо указать причину блокировки' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });

    const TERMINAL = ['completed', 'cancelled', 'blocked'];
    if (TERMINAL.includes(project.status)) {
      return NextResponse.json(
        { error: `Нельзя заблокировать проект со статусом "${project.status}"` },
        { status: 400 }
      );
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        status: 'blocked',
        blockedFrom: project.status,
        blockReason: reason.trim(),
        updatedAt: new Date(),
      },
    });

    console.log(`Проект "${project.title}" заблокирован администратором ${admin.email}. Причина: ${reason}`);

    return NextResponse.json({ message: 'Проект заблокирован', project: updated });
  } catch (error) {
    console.error('Ошибка при блокировке проекта:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
