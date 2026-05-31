import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ProjectStatus } from '@prisma/client';

// POST /api/admin/projects/[id]/unblock
// Разблокирует проект, восстанавливая статус до блокировки.
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

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });

    if (project.status !== 'blocked') {
      return NextResponse.json({ error: 'Проект не заблокирован' }, { status: 400 });
    }

    // Восстанавливаем статус до блокировки, или recruiting как резерв
    const restoreStatus: ProjectStatus = (project.blockedFrom as ProjectStatus) ?? 'recruiting';

    const updated = await prisma.project.update({
      where: { id },
      data: {
        status: restoreStatus,
        blockedFrom: null,
        blockReason: null,
        updatedAt: new Date(),
      },
    });

    console.log(`Проект "${project.title}" разблокирован администратором ${admin.email}. Статус восстановлен: ${restoreStatus}`);

    return NextResponse.json({
      message: 'Проект разблокирован',
      restoredStatus: restoreStatus,
      project: updated,
    });
  } catch (error) {
    console.error('Ошибка при разблокировке проекта:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
