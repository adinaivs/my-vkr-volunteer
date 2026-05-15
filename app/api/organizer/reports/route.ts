import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'organizer') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'all';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const statusFilter: string[] = [];
    if (reportType === 'active') statusFilter.push('active', 'recruiting', 'upcoming');
    else if (reportType === 'completed') statusFilter.push('completed');

    const projects = await prisma.project.findMany({
      where: {
        organizerId: session.userId,
        status: { notIn: ['draft'], ...(statusFilter.length ? { in: statusFilter as any[] } : {}) },
        ...(startDate ? { startDate: { gte: new Date(startDate) } } : {}),
        ...(endDate ? { endDate: { lte: new Date(endDate) } } : {}),
      },
      include: {
        category: { include: { translations: { where: { locale: 'ru' } } } },
        tasks: {
          include: {
            assignments: {
              where: { status: 'confirmed' },
              include: { volunteer: { select: { firstName: true, lastName: true } } },
            },
          },
        },
        participants: {
          include: { volunteer: { select: { id: true, firstName: true, lastName: true, email: true, city: true } } },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    const reportData = projects.map((p) => {
      const totalTasks = p.tasks.length;
      const completedTasks = p.tasks.filter((t) => t.status === 'completed').length;
      const totalParticipants = p.participants.length;

      return {
        id: p.id,
        title: p.title,
        status: p.status,
        category: p.category.translations[0]?.name || p.category.slug,
        location: p.location,
        startDate: p.startDate.toISOString().split('T')[0],
        endDate: p.endDate.toISOString().split('T')[0],
        maxVolunteers: p.maxVolunteers,
        currentVolunteers: p.currentVolunteers,
        totalParticipants,
        totalTasks,
        completedTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        participants: p.participants.map((pp) => ({
          name: `${pp.volunteer.firstName} ${pp.volunteer.lastName}`,
          email: pp.volunteer.email,
          city: pp.volunteer.city,
          joinedAt: pp.joinedAt.toISOString().split('T')[0],
        })),
      };
    });

    return NextResponse.json({ projects: reportData });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
