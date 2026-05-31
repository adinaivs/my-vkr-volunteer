import { NextRequest, NextResponse } from 'next/server';
import { getSession, getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/chats/[chatId]/messages - Получить сообщения чата
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const session = await getAuthenticatedUser();
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
      select: {
        id: true,
        content: true,
        audioUrl: true,
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
    await prisma.projectChatMessage.updateMany({
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
    await prisma.projectChatMessage.updateMany({
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

// POST /api/chats/[chatId]/messages - Отправить сообщение
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    console.log('[GroupChat POST] Начало обработки запроса');
    
    const session = await getAuthenticatedUser();
    console.log('[GroupChat POST] Сессия:', session ? `userId: ${session.userId}` : 'нет сессии');
    
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { chatId } = await params;
    console.log('[GroupChat POST] chatId:', chatId);

    const membership = await prisma.projectChatMember.findUnique({
      where: { chatId_userId: { chatId, userId: session.userId } },
    });
    console.log('[GroupChat POST] Членство:', membership ? 'найдено' : 'не найдено');

    if (!membership) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const body = await request.json();
    console.log('[GroupChat POST] Тело запроса:', body);
    const { content, audioUrl } = body;

    if (!content?.trim() && !audioUrl) {
      console.log('[GroupChat POST] Ошибка: пустое сообщение без аудио');
      return NextResponse.json({ error: 'Сообщение не может быть пустым' }, { status: 400 });
    }

    console.log('[GroupChat POST] Создание сообщения, content:', content?.trim(), 'audioUrl:', audioUrl);
    const message = await prisma.projectChatMessage.create({
      data: {
        chatId,
        senderId: session.userId,
        content: content?.trim() || '',
        ...(audioUrl ? { audioUrl } : {}),
      },
      select: {
        id: true,
        content: true,
        audioUrl: true,
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
    console.log('[GroupChat POST] Сообщение создано:', message.id);

    return NextResponse.json({ message });
  } catch (error) {
    console.error('[GroupChat POST] ОШИБКА:', error);
    console.error('[GroupChat POST] Stack trace:', error instanceof Error ? error.stack : 'нет stack trace');
    return NextResponse.json({ 
      error: 'Ошибка сервера',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
