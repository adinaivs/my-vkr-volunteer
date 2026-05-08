import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/chats/[chatId]/messages - Получить сообщения чата
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { chatId } = await params;

    // Проверяем, что пользователь — участник чата
    const membership = await prisma.projectChatMember.findUnique({
      where: { chatId_userId: { chatId, userId: session.userId } },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const before = searchParams.get('before'); // ISO timestamp для пагинации

    const messages = await prisma.projectChatMessage.findMany({
      where: {
        chatId,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Ошибка при получении сообщений:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST /api/chats/[chatId]/messages - Отправить сообщение
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { chatId } = await params;

    const membership = await prisma.projectChatMember.findUnique({
      where: { chatId_userId: { chatId, userId: session.userId } },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Сообщение не может быть пустым' }, { status: 400 });
    }

    const message = await prisma.projectChatMessage.create({
      data: {
        chatId,
        senderId: session.userId,
        content: content.trim(),
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Ошибка при отправке сообщения:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
