import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const [newUsers, pendingProjects, recentModerations, recentOrgApprovals] = await Promise.all([
      prisma.user.findMany({
        where: { role: { not: 'admin' } },
        select: { id: true, firstName: true, lastName: true, role: true, createdAt: true, avatarUrl: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.project.findMany({
        where: { status: 'moderation' },
        select: {
          id: true,
          title: true,
          createdAt: true,
          organizer: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.project.findMany({
        where: {
          moderatedAt: { not: null },
          status: { in: ['recruiting', 'rejected'] },
        },
        select: {
          id: true,
          title: true,
          status: true,
          moderatedAt: true,
          organizer: { select: { firstName: true, lastName: true } },
        },
        orderBy: { moderatedAt: 'desc' },
        take: 5,
      }),
      prisma.organizerProfile.findMany({
        where: {
          OR: [
            { approvedAt: { not: null } },
            { rejectedAt: { not: null } },
          ],
        },
        select: {
          isApprovedByAdmin: true,
          isRejected: true,
          approvedAt: true,
          rejectedAt: true,
          organizationName: true,
          user: { select: { firstName: true, lastName: true } },
        },
        orderBy: [{ approvedAt: 'desc' }, { rejectedAt: 'desc' }],
        take: 5,
      }),
    ]);

    // Объединяем в одну ленту и сортируем по дате
    const feed: { type: string; date: Date; data: any }[] = [
      ...newUsers.map((u) => ({ type: 'new_user', date: u.createdAt, data: u })),
      ...pendingProjects.map((p) => ({ type: 'project_moderation', date: p.createdAt, data: p })),
      ...recentModerations.map((p) => ({ type: 'project_moderated', date: p.moderatedAt!, data: p })),
      ...recentOrgApprovals.map((o) => ({
        type: o.isApprovedByAdmin ? 'org_approved' : 'org_rejected',
        date: (o.approvedAt || o.rejectedAt)!,
        data: o,
      })),
    ];

    feed.sort((a, b) => b.date.getTime() - a.date.getTime());

    return NextResponse.json({ activity: feed.slice(0, 15) });
  } catch (error) {
    console.error('Admin activity error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
