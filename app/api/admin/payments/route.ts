import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getAuthenticatedUser();
    if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const me = await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true } });
    if (!me || me.role !== 'admin') return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });

    const payments = await prisma.payment.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            organizerProfile: { select: { organizationName: true } },
          },
        },
        projects: { select: { id: true, title: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const stats = {
      total: payments.length,
      succeeded: payments.filter((p) => p.status === 'succeeded').length,
      totalAmount: payments
        .filter((p) => p.status === 'succeeded')
        .reduce((sum, p) => sum + Number(p.amount), 0),
    };

    return NextResponse.json({ payments, stats });
  } catch (error) {
    console.error('Error fetching admin payments:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
