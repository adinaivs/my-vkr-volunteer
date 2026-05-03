import { NextResponse } from 'next/server';
import { getSession, deleteSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
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
      },
    });

    if (!user) {
      // Пользователь был удален из БД, но сессия еще существует
      // Удаляем сессию и возвращаем 401
      await deleteSession();
      return NextResponse.json(
        { error: 'Пользователь не найден. Сессия удалена.' },
        { status: 401 }
      );
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
