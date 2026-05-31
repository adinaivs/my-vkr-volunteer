import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getAuthenticatedUser();
    if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const payments = await prisma.payment.findMany({
      where: { userId: session.userId },
      include: {
        projects: {
          select: { id: true, title: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ payments });
  } catch (error) {
    console.error('Error fetching organizer payments:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
