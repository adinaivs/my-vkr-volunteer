import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/direct-chats/[chatId]/messages - Получить сообщения личного чата
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

    // Проверяем, что пользователь является участником чата
    const chat = await prisma.directChat.findUnique({
      where: { id: chatId },
    });

    if (!chat) {
      return NextResponse.json({ error: 'Чат не найден' }, { status: 404 });
    }

    if (chat.user1Id !== session.userId && chat.user2Id !== session.userId) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const before = searchParams.get('before'); // ISO timestamp для пагинации

    const messages = await prisma.directMessage.findMany({
      where: {
        chatId,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        senderId: true,
        deliveredTo: true,
        readBy: true,
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

    // Помечаем все сообщения как доставленные текущему пользователю
    await prisma.directMessage.updateMany({
      where: {
        chatId,
        senderId: { not: session.userId },
        NOT: {
          deliveredTo: { has: session.userId },
        },
      },
      data: {
        deliveredTo: { push: session.userId },
      },
    });

    // Помечаем все непрочитанные сообщения как прочитанные
    await prisma.directMessage.updateMany({
      where: {
        chatId,
        senderId: { not: session.userId },
        NOT: {
          readBy: { has: session.userId },
        },
      },
      data: {
        readBy: { push: session.userId },
      },
    });

    return NextResponse.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Ошибка при получении сообщений:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST /api/direct-chats/[chatId]/messages - Отправить сообщение в личный чат
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

    // Проверяем, что пользователь является участником чата
    const chat = await prisma.directChat.findUnique({
      where: { id: chatId },
    });

    if (!chat) {
      return NextResponse.json({ error: 'Чат не найден' }, { status: 404 });
    }

    if (chat.user1Id !== session.userId && chat.user2Id !== session.userId) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Сообщение не может быть пустым' }, { status: 400 });
    }

    const message = await prisma.directMessage.create({
      data: {
        chatId,
        senderId: session.userId,
        content: content.trim(),
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        senderId: true,
        deliveredTo: true,
        readBy: true,
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
