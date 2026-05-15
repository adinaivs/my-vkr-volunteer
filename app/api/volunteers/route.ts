import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const volunteers = await prisma.user.findMany({
      where: { role: 'volunteer' },
      include: {
        volunteerProfile: true,
        skills: { include: { skill: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = volunteers.map((v) => ({
      id: v.id,
      firstName: v.firstName,
      lastName: v.lastName,
      email: v.email,
      phone: v.phone,
      avatarUrl: v.avatarUrl,
      city: v.city,
      volunteerProfile: v.volunteerProfile
        ? {
            bio: v.volunteerProfile.bio,
            trustScore: v.volunteerProfile.trustScore,
            completedTasks: v.volunteerProfile.completedTasks,
            completedProjects: v.volunteerProfile.completedProjects,
          }
        : null,
      skills: v.skills.map((us) => ({ id: us.skill.id, name: us.skill.name })),
    }));

    return NextResponse.json({ volunteers: formatted });
  } catch (error) {
    console.error('Error fetching volunteers:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
