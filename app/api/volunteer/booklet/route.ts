import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'volunteer') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const userId = session.userId;

    const [user, achievements] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          city: true,
          createdAt: true,
          volunteerProfile: {
            select: {
              bio: true,
              trustScore: true,
              ratingCount: true,
              completedTasks: true,
              completedProjects: true,
            },
          },
          skills: { include: { skill: { include: { translations: { where: { locale: 'ru' } } } } } },
          projectParticipants: {
            where: { isActive: true },
            include: {
              project: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  location: true,
                  startDate: true,
                  endDate: true,
                  status: true,
                  category: { include: { translations: { where: { locale: 'ru' } } } },
                  tasks: {
                    include: {
                      assignments: {
                        where: { volunteerId: userId },
                        select: { status: true, confirmedAt: true, rating: true, feedback: true },
                      },
                    },
                  },
                },
              },
            },
            orderBy: { joinedAt: 'asc' },
          },
        },
      }),
      prisma.userAchievement.findMany({
        where: { userId },
        include: {
          achievement: {
            include: { translations: { where: { locale: 'ru' } } },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    if (!user) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });

    const projects = user.projectParticipants.map((pp) => {
      const confirmedTasks = pp.project.tasks.filter(t =>
        t.assignments.some(a => ['completed', 'confirmed'].includes(a.status))
      );
      return {
        id: pp.project.id,
        title: pp.project.title,
        location: pp.project.location,
        startDate: pp.project.startDate,
        endDate: pp.project.endDate,
        status: pp.project.status,
        categoryName: pp.project.category.translations[0]?.name ?? pp.project.category.slug,
        confirmedTasksCount: confirmedTasks.length,
        totalTasksCount: pp.project.tasks.length,
        rating: confirmedTasks.find(t => t.assignments[0]?.rating)?.assignments[0]?.rating ?? null,
      };
    });

    return NextResponse.json({
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        city: user.city,
        createdAt: user.createdAt,
        bio: user.volunteerProfile?.bio ?? null,
        trustScore: Number(user.volunteerProfile?.trustScore ?? 0),
        ratingCount: user.volunteerProfile?.ratingCount ?? 0,
        completedTasks: user.volunteerProfile?.completedTasks ?? 0,
        completedProjects: user.volunteerProfile?.completedProjects ?? 0,
        skills: user.skills.map(us => us.skill.translations[0]?.name ?? us.skill.name),
      },
      projects,
      achievements: achievements.map(ua => ({
        name: ua.achievement.translations[0]?.name ?? ua.achievement.name,
        description: ua.achievement.translations[0]?.description ?? ua.achievement.description,
        icon: ua.achievement.icon,
        createdAt: ua.createdAt,
        expiresAt: ua.expiresAt,
      })),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
