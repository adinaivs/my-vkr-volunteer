import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
  }

  const { chatId } = await params;

  const chat = await prisma.aiChat.findUnique({
    where: { id: chatId },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, role: true } },
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!chat) {
    return NextResponse.json({ error: 'Чат не найден' }, { status: 404 });
  }

  return NextResponse.json({ chat });
}
