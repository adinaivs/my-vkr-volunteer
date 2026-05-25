import { NextRequest, NextResponse } from 'next/server';
import { getSession, getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/organizer/profile - Получить полный профиль организатора со статистикой
export async function GET() {
  try {
    const session = await getAuthenticatedUser();
    if (!session || session.role !== 'organizer') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
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
        createdAt: true,
        organizerProfile: {
          select: {
            organizationName: true,
            inn: true,
            okpo: true,
            legalAddress: true,
            actualAddress: true,
            verificationStatus: true,
            verificationDocUrl: true,
            freePostsRemaining: true,
            totalPaidPosts: true,
            isApprovedByAdmin: true,
            isRejected: true,
            rejectionReason: true,
            rejectedAt: true,
            approvedAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    // Статистика проектов
    const projectStats = await prisma.project.groupBy({
      by: ['status'],
      where: { organizerId: session.userId },
      _count: { id: true },
    });

    const totalProjects = projectStats.reduce((sum, s) => sum + s._count.id, 0);
    const activeProjects = projectStats
      .filter((s) => ['active', 'recruiting', 'upcoming'].includes(s.status))
      .reduce((sum, s) => sum + s._count.id, 0);
    const completedProjects = projectStats
      .filter((s) => s.status === 'completed')
      .reduce((sum, s) => sum + s._count.id, 0);

    // Количество подтверждённых волонтёров
    const volunteersCount = await prisma.projectParticipant.count({
      where: {
        project: { organizerId: session.userId },
        isActive: true,
      },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        city: user.city,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        organizerProfile: user.organizerProfile,
      },
      stats: {
        totalProjects,
        activeProjects,
        completedProjects,
        volunteersCount,
      },
    });
  } catch (error) {
    console.error('Ошибка при получении профиля организатора:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// PUT /api/organizer/profile - Обновить личные данные организатора
export async function PUT(request: NextRequest) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || session.role !== 'organizer') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const body = await request.json();
    const { firstName, lastName, phone, city } = body;

    if (firstName !== undefined && !firstName.trim()) {
      return NextResponse.json({ error: 'Имя не может быть пустым' }, { status: 400 });
    }
    if (lastName !== undefined && !lastName.trim()) {
      return NextResponse.json({ error: 'Фамилия не может быть пустой' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: {
        ...(firstName?.trim() && { firstName: firstName.trim() }),
        ...(lastName?.trim() && { lastName: lastName.trim() }),
        ...(phone?.trim() && { phone: phone.trim() }),
        ...(city?.trim() && { city: city.trim() }),
      },
    });

    return NextResponse.json({ message: 'Профиль обновлён' });
  } catch (error) {
    console.error('Ошибка при обновлении профиля организатора:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
