import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'organizer') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const organizerId = session.userId;

    const [projects, pendingApplications, recentApplications] = await Promise.all([
      prisma.project.findMany({
        where: { organizerId },
        select: {
          id: true,
          title: true,
          status: true,
          currentVolunteers: true,
          startDate: true,
          endDate: true,
          participants: { select: { id: true } },
        },
      }),
      prisma.application.count({
        where: {
          status: 'pending',
          project: { organizerId },
        },
      }),
      prisma.application.findMany({
        where: { project: { organizerId } },
        include: {
          volunteer: { select: { firstName: true, lastName: true, avatarUrl: true } },
          project: { select: { id: true, title: true } },
        },
        orderBy: { appliedAt: 'desc' },
        take: 5,
      }),
    ]);

    const totalProjects = projects.length;
    const activeProjects = projects.filter(p =>
      ['recruiting', 'upcoming', 'active'].includes(p.status)
    ).length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    const totalVolunteers = projects.reduce((sum, p) => sum + p.participants.length, 0);

    const statusCounts: Record<string, number> = {};
    for (const p of projects) {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
    }

    return NextResponse.json({
      totalProjects,
      activeProjects,
      completedProjects,
      totalVolunteers,
      pendingApplications,
      statusCounts,
      recentApplications: recentApplications.map(a => ({
        id: a.id,
        status: a.status,
        appliedAt: a.appliedAt,
        volunteer: a.volunteer,
        project: a.project,
      })),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
