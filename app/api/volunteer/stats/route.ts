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

    const [profile, achievements, activeParticipants, pendingApplications] = await Promise.all([
      prisma.volunteerProfile.findUnique({
        where: { userId },
        select: { completedProjects: true, completedTasks: true, trustScore: true, ratingCount: true },
      }),
      prisma.userAchievement.count({ where: { userId } }),
      prisma.projectParticipant.findMany({
        where: {
          volunteerId: userId,
          isActive: true,
          project: { status: { in: ['recruiting', 'upcoming', 'active'] } },
        },
        include: {
          project: {
            select: {
              id: true,
              title: true,
              status: true,
              startDate: true,
              endDate: true,
              location: true,
              imageUrl: true,
              currentVolunteers: true,
              maxVolunteers: true,
              category: {
                include: { translations: { where: { locale: 'ru' } } },
              },
              tasks: {
                include: {
                  assignments: {
                    where: { volunteerId: userId },
                    select: { status: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
        take: 3,
      }),
      prisma.application.count({
        where: { volunteerId: userId, status: 'pending' },
      }),
    ]);

    const currentProjects = activeParticipants.map((p) => {
      const myTasks = p.project.tasks.filter(t => t.assignments.length > 0);
      const doneTasks = myTasks.filter(t => t.assignments.some(a => ['completed', 'confirmed'].includes(a.status)));
      return {
        id: p.project.id,
        title: p.project.title,
        status: p.project.status,
        startDate: p.project.startDate,
        endDate: p.project.endDate,
        location: p.project.location,
        imageUrl: p.project.imageUrl,
        categoryName: p.project.category.translations[0]?.name ?? p.project.category.slug,
        myTasksTotal: myTasks.length,
        myTasksDone: doneTasks.length,
      };
    });

    return NextResponse.json({
      activeProjects: activeParticipants.length,
      completedProjects: profile?.completedProjects ?? 0,
      completedTasks: profile?.completedTasks ?? 0,
      achievementsCount: achievements,
      trustScore: Number(profile?.trustScore ?? 0),
      ratingCount: profile?.ratingCount ?? 0,
      pendingApplications,
      currentProjects,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
