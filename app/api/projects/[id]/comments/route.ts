import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, getAuthenticatedUser } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  role: true,
  organizerProfile: { select: { organizationName: true } },
} as const;

// GET — публичный, список комментариев с вложенными ответами
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    const comments = await prisma.projectComment.findMany({
      where: { projectId, parentId: null },
      include: {
        user: { select: userSelect },
        replies: {
          include: { user: { select: userSelect } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST — требует авторизации; принимает опциональный parentId
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthenticatedUser();
    if (!session) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const body = await request.json();
    const { text, parentId } = body;

    if (!text || text.trim().length < 2) {
      return NextResponse.json({ error: 'Комментарий слишком короткий' }, { status: 400 });
    }
    if (text.trim().length > 1000) {
      return NextResponse.json({ error: 'Комментарий не должен превышать 1000 символов' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });
    }

    // Если указан parentId — проверяем, что такой комментарий существует и принадлежит этому проекту
    if (parentId) {
      const parent = await prisma.projectComment.findUnique({
        where: { id: parentId },
        select: { id: true, projectId: true, parentId: true },
      });
      if (!parent || parent.projectId !== projectId) {
        return NextResponse.json({ error: 'Родительский комментарий не найден' }, { status: 404 });
      }
      // Защита от глубокой вложенности: ответ на ответ уходит к корневому комментарию
      // (parent.parentId уже задан — значит это ответ, поднимаем уровень)
    }

    const comment = await prisma.projectComment.create({
      data: {
        projectId,
        userId: session.userId,
        text: text.trim(),
        parentId: parentId || null,
      },
      include: {
        user: { select: userSelect },
        replies: {
          include: { user: { select: userSelect } },
        },
      },
    });

    // Уведомление автору родительского комментария (если это ответ и не самому себе)
    if (parentId) {
      const parent = await prisma.projectComment.findUnique({
        where: { id: parentId },
        select: { userId: true },
      });
      if (parent && parent.userId !== session.userId) {
        const proj = await prisma.project.findUnique({
          where: { id: projectId },
          select: { title: true },
        });
        const author = await prisma.user.findUnique({
          where: { id: session.userId },
          select: { firstName: true, lastName: true },
        });
        await createNotification({
          userId: parent.userId,
          type: 'comment_reply',
          title: `${author?.firstName} ${author?.lastName} ответил(а) на ваш комментарий`,
          body: comment.text.slice(0, 120),
          link: `/volunteer/projects/${projectId}`,
        });
      }
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// DELETE — удаление своего комментария (или ответа)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthenticatedUser();
    if (!session) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');

    if (!commentId) {
      return NextResponse.json({ error: 'Не указан ID комментария' }, { status: 400 });
    }

    const comment = await prisma.projectComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return NextResponse.json({ error: 'Комментарий не найден' }, { status: 404 });
    }

    if (comment.userId !== session.userId && session.role !== 'admin') {
      return NextResponse.json({ error: 'Нет прав для удаления' }, { status: 403 });
    }

    await prisma.projectComment.delete({ where: { id: commentId } });

    return NextResponse.json({ message: 'Комментарий удалён' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
