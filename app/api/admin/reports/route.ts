import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const admin = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'summary'; // summary | users | projects
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const dateFilter = {
      ...(startDate ? { gte: new Date(startDate) } : {}),
      ...(endDate ? { lte: new Date(endDate + 'T23:59:59') } : {}),
    };
    const hasDateFilter = startDate || endDate;

    // ── Сводный отчёт ──────────────────────────────────────────────────────────
    if (reportType === 'summary') {
      const now = new Date();
      const months: { label: string; from: Date; to: Date }[] = [];
      for (let i = 5; i >= 0; i--) {
        const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
        months.push({
          label: from.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }),
          from,
          to,
        });
      }

      const [
        totalUsers, totalVolunteers, totalOrganizers,
        totalProjects, activeProjects, completedProjects,
        totalTasks, completedTasks,
        projectsByStatus,
        topVolunteers,
        topOrganizers,
        categories,
        monthlyReg,
        monthlyProj,
      ] = await Promise.all([
        prisma.user.count({ where: { role: { not: 'admin' }, ...(hasDateFilter ? { createdAt: dateFilter } : {}) } }),
        prisma.user.count({ where: { role: 'volunteer', ...(hasDateFilter ? { createdAt: dateFilter } : {}) } }),
        prisma.user.count({ where: { role: 'organizer', ...(hasDateFilter ? { createdAt: dateFilter } : {}) } }),
        prisma.project.count({ where: hasDateFilter ? { createdAt: dateFilter } : {} }),
        prisma.project.count({ where: { status: 'active', ...(hasDateFilter ? { createdAt: dateFilter } : {}) } }),
        prisma.project.count({ where: { status: 'completed', ...(hasDateFilter ? { createdAt: dateFilter } : {}) } }),
        prisma.task.count(),
        prisma.task.count({ where: { status: 'completed' } }),
        prisma.project.groupBy({ by: ['status'], _count: { id: true } }),
        prisma.volunteerProfile.findMany({
          orderBy: { completedTasks: 'desc' },
          take: 10,
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, city: true } },
          },
        }),
        prisma.user.findMany({
          where: { role: 'organizer' },
          select: {
            id: true, firstName: true, lastName: true, email: true, city: true,
            organizerProfile: { select: { organizationName: true } },
            _count: { select: { projects: true } },
          },
          orderBy: { projects: { _count: 'desc' } },
          take: 10,
        }),
        prisma.category.findMany({
          include: {
            translations: { where: { locale: 'ru' } },
            _count: { select: { projects: true } },
          },
          orderBy: { projects: { _count: 'desc' } },
          take: 8,
        }),
        Promise.all(months.map(m =>
          prisma.user.count({ where: { role: { not: 'admin' }, createdAt: { gte: m.from, lte: m.to } } })
            .then(count => ({ label: m.label, count }))
        )),
        Promise.all(months.map(m =>
          prisma.project.count({ where: { createdAt: { gte: m.from, lte: m.to } } })
            .then(count => ({ label: m.label, count }))
        )),
      ]);

      return NextResponse.json({
        reportType: 'summary',
        totals: { totalUsers, totalVolunteers, totalOrganizers, totalProjects, activeProjects, completedProjects, totalTasks, completedTasks },
        projectsByStatus: projectsByStatus.map(p => ({ status: p.status, count: p._count.id })),
        topVolunteers: topVolunteers.map(v => ({
          name: `${v.user.firstName} ${v.user.lastName}`,
          email: v.user.email,
          city: v.user.city,
          completedTasks: v.completedTasks,
          completedProjects: v.completedProjects,
          trustScore: Number(v.trustScore).toFixed(1),
        })),
        topOrganizers: topOrganizers.map(o => ({
          name: `${o.firstName} ${o.lastName}`,
          email: o.email,
          city: o.city,
          organizationName: o.organizerProfile?.organizationName ?? '—',
          projectsCount: o._count.projects,
        })),
        categories: categories.map(c => ({
          name: c.translations[0]?.name ?? c.slug,
          count: c._count.projects,
        })),
        monthlyRegistrations: monthlyReg,
        monthlyProjects: monthlyProj,
      });
    }

    // ── Отчёт по пользователям ─────────────────────────────────────────────────
    if (reportType === 'users') {
      const users = await prisma.user.findMany({
        where: {
          role: { not: 'admin' },
          ...(hasDateFilter ? { createdAt: dateFilter } : {}),
        },
        select: {
          id: true, firstName: true, lastName: true, email: true, phone: true,
          role: true, city: true, status: true, createdAt: true,
          volunteerProfile: {
            select: { completedTasks: true, completedProjects: true, trustScore: true },
          },
          organizerProfile: {
            select: { organizationName: true, verificationStatus: true, isApprovedByAdmin: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({
        reportType: 'users',
        users: users.map(u => ({
          name: `${u.firstName} ${u.lastName}`,
          email: u.email,
          phone: u.phone,
          role: u.role,
          city: u.city,
          status: u.status,
          registeredAt: u.createdAt.toISOString().split('T')[0],
          completedTasks: u.volunteerProfile?.completedTasks ?? null,
          completedProjects: u.volunteerProfile?.completedProjects ?? null,
          trustScore: u.volunteerProfile ? Number(u.volunteerProfile.trustScore).toFixed(1) : null,
          organizationName: u.organizerProfile?.organizationName ?? null,
          verificationStatus: u.organizerProfile?.verificationStatus ?? null,
        })),
      });
    }

    // ── Отчёт по проектам ──────────────────────────────────────────────────────
    if (reportType === 'projects') {
      const projects = await prisma.project.findMany({
        where: hasDateFilter ? { createdAt: dateFilter } : {},
        include: {
          category: { include: { translations: { where: { locale: 'ru' } } } },
          organizer: {
            select: {
              firstName: true, lastName: true,
              organizerProfile: { select: { organizationName: true } },
            },
          },
          tasks: { select: { id: true, status: true } },
          participants: { select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({
        reportType: 'projects',
        projects: projects.map(p => ({
          title: p.title,
          status: p.status,
          category: p.category.translations[0]?.name ?? p.category.slug,
          location: p.location,
          startDate: p.startDate.toISOString().split('T')[0],
          endDate: p.endDate.toISOString().split('T')[0],
          createdAt: p.createdAt.toISOString().split('T')[0],
          maxVolunteers: p.maxVolunteers,
          currentVolunteers: p.currentVolunteers,
          participantsCount: p.participants.length,
          totalTasks: p.tasks.length,
          completedTasks: p.tasks.filter(t => t.status === 'completed').length,
          organizerName: `${p.organizer.firstName} ${p.organizer.lastName}`,
          organizationName: p.organizer.organizerProfile?.organizationName ?? '—',
        })),
      });
    }

    return NextResponse.json({ error: 'Неверный тип отчёта' }, { status: 400 });
  } catch (error) {
    console.error('Admin reports error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
