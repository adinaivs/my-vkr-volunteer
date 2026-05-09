import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    const admin = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });

    const now = new Date();
    const months: { label: string; from: Date; to: Date }[] = [];
    for (let i = 5; i >= 0; i--) {
      const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      months.push({
        label: from.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }),
        from,
        to,
      });
    }

    const [
      totalUsers,
      totalVolunteers,
      totalOrganizers,
      totalProjects,
      totalCompletedProjects,
      totalTasks,
      totalCompletedTasks,
      projectsByStatus,
      topVolunteers,
      topOrganizers,
      categories,
    ] = await Promise.all([
      prisma.user.count({ where: { role: { not: 'admin' } } }),
      prisma.user.count({ where: { role: 'volunteer' } }),
      prisma.user.count({ where: { role: 'organizer' } }),
      prisma.project.count(),
      prisma.project.count({ where: { status: 'completed' } }),
      prisma.task.count(),
      prisma.task.count({ where: { status: 'completed' } }),
      prisma.project.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.volunteerProfile.findMany({
        orderBy: { completedTasks: 'desc' },
        take: 10,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, city: true } },
        },
      }),
      prisma.user.findMany({
        where: { role: 'organizer' },
        select: {
          id: true, firstName: true, lastName: true, email: true, avatarUrl: true, city: true,
          organizerProfile: { select: { organizationName: true } },
          _count: { select: { projects: true } },
        },
        orderBy: { projects: { _count: 'desc' } },
        take: 10,
      }),
      prisma.category.findMany({
        include: {
          translations: true,
          _count: { select: { projects: true } },
        },
      }),
    ]);

    // Регистрации по месяцам — параллельно
    const monthlyRegistrations = await Promise.all(
      months.map((m) =>
        prisma.user.count({
          where: { role: { not: 'admin' }, createdAt: { gte: m.from, lte: m.to } },
        }).then((count) => ({ label: m.label, count }))
      )
    );

    const monthlyProjects = await Promise.all(
      months.map((m) =>
        prisma.project.count({
          where: { createdAt: { gte: m.from, lte: m.to } },
        }).then((count) => ({ label: m.label, count }))
      )
    );

    const categoriesWithCount = categories.map((c) => ({
      id: c.id,
      name: c.translations.find((t) => t.locale === 'ru')?.name || c.slug,
      icon: c.icon,
      projectsCount: c._count.projects,
    })).sort((a, b) => b.projectsCount - a.projectsCount);

    return NextResponse.json({
      totals: { totalUsers, totalVolunteers, totalOrganizers, totalProjects, totalCompletedProjects, totalTasks, totalCompletedTasks },
      projectsByStatus: projectsByStatus.map((p) => ({ status: p.status, count: p._count.id })),
      monthlyRegistrations,
      monthlyProjects,
      topVolunteers: topVolunteers.map((v) => ({
        id: v.user.id,
        firstName: v.user.firstName,
        lastName: v.user.lastName,
        email: v.user.email,
        avatarUrl: v.user.avatarUrl,
        city: v.user.city,
        completedTasks: v.completedTasks,
        completedProjects: v.completedProjects,
        trustScore: v.trustScore,
      })),
      topOrganizers: topOrganizers.map((o) => ({
        id: o.id,
        firstName: o.firstName,
        lastName: o.lastName,
        email: o.email,
        avatarUrl: o.avatarUrl,
        city: o.city,
        organizationName: o.organizerProfile?.organizationName,
        projectsCount: o._count.projects,
      })),
      categoriesWithCount,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
