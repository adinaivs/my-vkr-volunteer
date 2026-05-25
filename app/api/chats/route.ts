import { NextResponse } from 'next/server';
import { getSession, getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/chats - Список чатов текущего пользователя
export async function GET() {
  try {
    const session = await getAuthenticatedUser();
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const memberships = await prisma.projectChatMember.findMany({
      where: { userId: session.userId },
      include: {
        chat: {
          include: {
            project: {
              select: {
                id: true,
                title: true,
                status: true,
                imageUrl: true,
                organizer: {
                  select: { id: true, firstName: true, lastName: true },
                },
              },
            },
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    avatarUrl: true,
                    role: true,
                  },
                },
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
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    // Подсчитываем непрочитанные сообщения для каждого чата
    const chatsWithUnread = await Promise.all(
      memberships.map(async (m) => {
        const unreadCount = await prisma.projectChatMessage.count({
          where: {
            chatId: m.chat.id,
            senderId: { not: session.userId },
            NOT: {
              readBy: { has: session.userId },
            },
          },
        });

        return {
          id: m.chat.id,
          name: m.chat.name,
          createdAt: m.chat.createdAt,
          project: m.chat.project,
          membersCount: m.chat.members.length,
          members: m.chat.members.map((mem) => mem.user),
          lastMessage: m.chat.messages[0] ?? null,
          unreadCount,
          // Добавляем поле для сортировки
          sortTime: m.chat.messages[0]?.createdAt ?? m.chat.createdAt,
        };
      })
    );

    // Сортируем по времени последнего сообщения (самые свежие сверху)
    chatsWithUnread.sort((a, b) => new Date(b.sortTime).getTime() - new Date(a.sortTime).getTime());

    return NextResponse.json({ chats: chatsWithUnread });
  } catch (error) {
    console.error('Ошибка при получении чатов:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
