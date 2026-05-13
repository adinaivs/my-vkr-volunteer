import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/direct-chats - Получить список личных чатов текущего пользователя
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Находим все чаты, где пользователь является user1 или user2
    const chats = await prisma.directChat.findMany({
      where: {
        OR: [
          { user1Id: session.userId },
          { user2Id: session.userId },
        ],
      },
      include: {
        user1: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            role: true,
          },
        },
        user2: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            role: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Форматируем данные для фронтенда и подсчитываем непрочитанные
    const formattedChats = await Promise.all(
      chats.map(async (chat) => {
        // Определяем собеседника (другого пользователя)
        const otherUser = chat.user1Id === session.userId ? chat.user2 : chat.user1;
        
        // Подсчитываем непрочитанные сообщения
        const unreadCount = await prisma.directMessage.count({
          where: {
            chatId: chat.id,
            senderId: { not: session.userId },
            NOT: {
              readBy: { has: session.userId },
            },
          },
        });

        return {
          id: chat.id,
          otherUser,
          lastMessage: chat.messages[0] ?? null,
          createdAt: chat.createdAt,
          unreadCount,
          // Добавляем поле для сортировки
          sortTime: chat.messages[0]?.createdAt ?? chat.createdAt,
        };
      })
    );

    // Сортируем по времени последнего сообщения (самые свежие сверху)
    formattedChats.sort((a, b) => new Date(b.sortTime).getTime() - new Date(a.sortTime).getTime());

    return NextResponse.json({ chats: formattedChats });
  } catch (error) {
    console.error('Ошибка при получении личных чатов:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST /api/direct-chats - Создать или получить существующий личный чат
export async function POST(request: Request) {
  try {
    console.log('[DirectChats POST] Начало обработки запроса');
    
    const session = await getSession();
    console.log('[DirectChats POST] Сессия:', session ? `userId: ${session.userId}` : 'нет сессии');
    
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const body = await request.json();
    console.log('[DirectChats POST] Тело запроса:', body);
    const { otherUserId } = body;

    if (!otherUserId) {
      console.log('[DirectChats POST] Ошибка: не указан ID собеседника');
      return NextResponse.json({ error: 'Не указан ID собеседника' }, { status: 400 });
    }

    // Проверяем, что пользователь не пытается создать чат с самим собой
    if (otherUserId === session.userId) {
      console.log('[DirectChats POST] Ошибка: попытка создать чат с самим собой');
      return NextResponse.json({ error: 'Нельзя создать чат с самим собой' }, { status: 400 });
    }

    // Проверяем, существует ли другой пользователь
    console.log('[DirectChats POST] Поиск пользователя:', otherUserId);
    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId },
      select: { id: true, role: true },
    });
    console.log('[DirectChats POST] Найден пользователь:', otherUser);

    if (!otherUser) {
      console.log('[DirectChats POST] Ошибка: пользователь не найден');
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    // Получаем текущего пользователя
    console.log('[DirectChats POST] Поиск текущего пользователя:', session.userId);
    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true },
    });
    console.log('[DirectChats POST] Текущий пользователь:', currentUser);

    if (!currentUser) {
      console.log('[DirectChats POST] Ошибка: текущий пользователь не найден');
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    // Проверяем, что один из пользователей - организатор, а другой - волонтер
    const isValidPair = 
      (currentUser.role === 'organizer' && otherUser.role === 'volunteer') ||
      (currentUser.role === 'volunteer' && otherUser.role === 'organizer');

    console.log('[DirectChats POST] Проверка пары:', { currentRole: currentUser.role, otherRole: otherUser.role, isValid: isValidPair });

    if (!isValidPair) {
      console.log('[DirectChats POST] Ошибка: недопустимая пара пользователей');
      return NextResponse.json(
        { error: 'Личные чаты доступны только между организаторами и волонтерами' },
        { status: 403 }
      );
    }

    // Определяем порядок user1 и user2 (всегда организатор первый для консистентности)
    const [user1Id, user2Id] = currentUser.role === 'organizer' 
      ? [session.userId, otherUserId]
      : [otherUserId, session.userId];

    console.log('[DirectChats POST] Порядок пользователей:', { user1Id, user2Id });

    // Ищем существующий чат или создаем новый
    console.log('[DirectChats POST] Поиск существующего чата');
    let chat = await prisma.directChat.findUnique({
      where: {
        user1Id_user2Id: {
          user1Id,
          user2Id,
        },
      },
    });
    console.log('[DirectChats POST] Существующий чат:', chat ? `найден: ${chat.id}` : 'не найден');

    if (!chat) {
      console.log('[DirectChats POST] Создание нового чата');
      chat = await prisma.directChat.create({
        data: {
          user1Id,
          user2Id,
        },
      });
      console.log('[DirectChats POST] Чат создан:', chat.id);
    }

    console.log('[DirectChats POST] Успешно, возвращаем chatId:', chat.id);
    return NextResponse.json({ chatId: chat.id });
  } catch (error) {
    console.error('[DirectChats POST] ОШИБКА:', error);
    console.error('[DirectChats POST] Stack trace:', error instanceof Error ? error.stack : 'нет stack trace');
    return NextResponse.json({ 
      error: 'Ошибка сервера', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
