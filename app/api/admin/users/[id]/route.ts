import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    const admin = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, phone: true, firstName: true, lastName: true,
        city: true, role: true, status: true, avatarUrl: true, createdAt: true,
        volunteerProfile: true,
        organizerProfile: true,
        skills: { include: { skill: { include: { translations: true } } } },
        achievements: {
          include: { achievement: { include: { translations: true } } },
          orderBy: { createdAt: 'desc' },
        },
        taskAssignments: {
          include: {
            task: {
              select: {
                id: true, title: true,
                project: { select: { id: true, title: true, status: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        projectParticipants: {
          include: {
            project: {
              select: {
                id: true, title: true, status: true,
                startDate: true, endDate: true,
                category: { include: { translations: true } },
              },
            },
          },
          orderBy: { joinedAt: 'desc' },
        },
        projects: {
          select: {
            id: true, title: true, status: true, createdAt: true,
            currentVolunteers: true, maxVolunteers: true,
            category: { include: { translations: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    return NextResponse.json({ user });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
