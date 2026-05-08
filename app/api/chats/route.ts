import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/chats - Список чатов текущего пользователя
export async function GET() {
  try {
    const session = await getSession();
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

    const chats = memberships.map((m) => ({
      id: m.chat.id,
      name: m.chat.name,
      createdAt: m.chat.createdAt,
      project: m.chat.project,
      membersCount: m.chat.members.length,
      members: m.chat.members.map((mem) => mem.user),
      lastMessage: m.chat.messages[0] ?? null,
    }));

    return NextResponse.json({ chats });
  } catch (error) {
    console.error('Ошибка при получении чатов:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
