import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

async function checkAdmin() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  return user?.role === 'admin' ? user : null;
}

export async function GET(request: NextRequest) {
  try {
    if (!await checkAdmin()) return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const issued = await prisma.userAchievement.findMany({
      where: search ? {
        OR: [
          { user: { firstName: { contains: search, mode: 'insensitive' } } },
          { user: { lastName: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { achievement: { name: { contains: search, mode: 'insensitive' } } },
        ],
      } : undefined,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, city: true } },
        achievement: { include: { translations: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ issued });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!await checkAdmin()) return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });

    const { userId, achievementId, rewardText, validDays } = await request.json();

    if (!userId || !achievementId) {
      return NextResponse.json({ error: 'userId и achievementId обязательны' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });

    const achievement = await prisma.achievement.findUnique({ where: { id: achievementId } });
    if (!achievement) return NextResponse.json({ error: 'Достижение не найдено' }, { status: 404 });

    const existing = await prisma.userAchievement.findFirst({ where: { userId, achievementId } });
    if (existing) return NextResponse.json({ error: 'У пользователя уже есть это достижение' }, { status: 409 });

    const days = parseInt(validDays) || 365;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const issued = await prisma.userAchievement.create({
      data: {
        userId,
        achievementId,
        rewardText: rewardText?.trim() || achievement.name,
        expiresAt,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        achievement: true,
      },
    });

    return NextResponse.json({ issued }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
