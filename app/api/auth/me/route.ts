import { NextResponse } from 'next/server';
import { getSession, deleteSession } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    const user = await withDbRetry(() => prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        city: true,
        avatarUrl: true,
        role: true,
        status: true,
        createdAt: true,
        organizerProfile: {
          select: {
            isApprovedByAdmin: true,
            isRejected: true,
            approvedAt: true,
            rejectedAt: true,
            rejectionReason: true,
            organizationName: true,
            inn: true,
            okpo: true,
            legalAddress: true,
            actualAddress: true,
            verificationDocUrl: true,
            freePostsRemaining: true,
          },
        },
        volunteerProfile: {
          select: {
            bio: true,
            trustScore: true,
            completedTasks: true,
            completedProjects: true,
          },
        },
        skills: {
          select: {
            skill: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }));

    if (!user) {
      await deleteSession();
      return NextResponse.json({ error: 'Пользователь не найден. Сессия удалена.' }, { status: 401 });
    }

    if (user.status === 'blocked') {
      await deleteSession();
      return NextResponse.json({ error: 'Аккаунт заблокирован.' }, { status: 403 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении данных пользователя' },
      { status: 500 }
    );
  }
}
