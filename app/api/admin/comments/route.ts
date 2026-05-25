import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET — список всех комментариев для админа (с поиском, фильтрацией, пагинацией)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search    = searchParams.get('search') || '';
    const projectId = searchParams.get('projectId') || '';
    const page      = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit     = 20;
    const skip      = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { text: { contains: search, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName:  { contains: search, mode: 'insensitive' } },
            ],
          },
        },
        { project: { title: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (projectId) {
      where.projectId = projectId;
    }

    const [comments, total, todayCount] = await Promise.all([
      prisma.projectComment.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true },
          },
          project: {
            select: { id: true, title: true },
          },
          _count: { select: { replies: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.projectComment.count({ where }),
      prisma.projectComment.count({
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    return NextResponse.json({
      comments,
      total,
      todayCount,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Admin comments GET error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// DELETE — удаление комментария администратором (вместе со всеми ответами)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('id');

    if (!commentId) {
      return NextResponse.json({ error: 'Не указан ID комментария' }, { status: 400 });
    }

    const comment = await prisma.projectComment.findUnique({
      where: { id: commentId },
    });
    if (!comment) {
      return NextResponse.json({ error: 'Комментарий не найден' }, { status: 404 });
    }

    // Сначала удаляем все ответы, потом сам комментарий
    await prisma.projectComment.deleteMany({ where: { parentId: commentId } });
    await prisma.projectComment.delete({ where: { id: commentId } });

    return NextResponse.json({ message: 'Комментарий удалён' });
  } catch (error) {
    console.error('Admin comments DELETE error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
