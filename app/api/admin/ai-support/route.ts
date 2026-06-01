import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 20;
  const skip = (page - 1) * limit;

  const where = search
    ? {
        user: {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        },
      }
    : {};

  const [chats, total] = await Promise.all([
    prisma.aiChat.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, role: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.aiChat.count({ where }),
  ]);

  // Статистика
  const [totalChats, totalMessages, uniqueUsers] = await Promise.all([
    prisma.aiChat.count(),
    prisma.aiMessage.count(),
    prisma.aiChat.groupBy({ by: ['userId'], _count: true }).then((r) => r.length),
  ]);

  const aiMessages = await prisma.aiMessage.count({ where: { sender: 'ai' } });
  const aiResolutionRate = totalMessages > 0 ? Math.round((aiMessages / totalMessages) * 100) : 0;

  return NextResponse.json({
    chats,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    stats: { totalChats, totalMessages, uniqueUsers, aiResolutionRate },
  });
}
