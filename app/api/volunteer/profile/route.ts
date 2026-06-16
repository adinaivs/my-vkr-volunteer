import { NextRequest, NextResponse } from 'next/server';
import { getSession, getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/volunteer/profile - Получить полный профиль волонтёра
export async function GET() {
  try {
    const session = await getAuthenticatedUser();
    if (!session || session.role !== 'volunteer') {
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
        volunteerProfile: {
          select: {
            bio: true,
            trustScore: true,
            ratingCount: true,
            completedTasks: true,
            completedProjects: true,
            totalHoursWorked: true,
          },
        },
        skills: {
          include: {
            skill: {
              include: {
                translations: {
                  where: { locale: 'ru' },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    const skills = user.skills.map((us) => ({
      id: us.skill.id,
      name: us.skill.translations[0]?.name || us.skill.name,
    }));

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
        volunteerProfile: user.volunteerProfile,
        skills,
      },
    });
  } catch (error) {
    console.error('Ошибка при получении профиля волонтёра:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// PUT /api/volunteer/profile - Обновить профиль волонтёра
export async function PUT(request: NextRequest) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || session.role !== 'volunteer') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const body = await request.json();
    const { firstName, lastName, phone, city, bio } = body;

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

    await prisma.volunteerProfile.upsert({
      where: { userId: session.userId },
      update: { bio: bio ?? null },
      create: { userId: session.userId, bio: bio ?? null },
    });

    return NextResponse.json({ message: 'Профиль обновлён' });
  } catch (error) {
    console.error('Ошибка при обновлении профиля волонтёра:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
