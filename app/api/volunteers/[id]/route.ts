import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { id } = await params;

    const volunteer = await prisma.user.findUnique({
      where: { id, role: 'volunteer' },
      include: {
        volunteerProfile: true,
        skills: { include: { skill: true } },
        projectParticipants: {
          include: {
            project: {
              select: {
                id: true,
                title: true,
                status: true,
                imageUrl: true,
                startDate: true,
                endDate: true,
                category: { include: { translations: true } },
              },
            },
          },
          orderBy: { joinedAt: 'desc' },
        },
        // achievements — правильное имя relation из схемы
        achievements: {
          include: {
            achievement: {
              include: { translations: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        // Рейтинги — через taskAssignments (поле rating на TaskAssignment)
        taskAssignments: {
          where: { rating: { not: null } },
          select: {
            rating: true,
            feedback: true,
            createdAt: true,
            task: { select: { title: true, project: { select: { title: true } } } },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!volunteer) {
      return NextResponse.json({ error: 'Волонтёр не найден' }, { status: 404 });
    }

    const data = {
      id: volunteer.id,
      firstName: volunteer.firstName,
      lastName: volunteer.lastName,
      email: volunteer.email,
      phone: volunteer.phone,
      avatarUrl: volunteer.avatarUrl,
      city: volunteer.city,
      createdAt: volunteer.createdAt,
      volunteerProfile: volunteer.volunteerProfile
        ? {
            bio: volunteer.volunteerProfile.bio,
            trustScore: volunteer.volunteerProfile.trustScore,
            completedTasks: volunteer.volunteerProfile.completedTasks,
            completedProjects: volunteer.volunteerProfile.completedProjects,
          }
        : null,
      skills: volunteer.skills.map((us) => ({ id: us.skill.id, name: us.skill.name })),
      projects: volunteer.projectParticipants.map((pp) => ({
        id: pp.project.id,
        title: pp.project.title,
        status: pp.project.status,
        startDate: pp.project.startDate,
        endDate: pp.project.endDate,
        isActive: pp.isActive,
        joinedAt: pp.joinedAt,
        categoryName:
          pp.project.category.translations.find((t) => t.locale === 'ru')?.name ?? '',
      })),
      achievements: volunteer.achievements.map((ua) => ({
        id: ua.id,
        createdAt: ua.createdAt,
        expiresAt: ua.expiresAt,
        achievement: {
          id: ua.achievement.id,
          icon: ua.achievement.icon,
          name:
            ua.achievement.translations.find((t) => t.locale === 'ru')?.name ??
            ua.achievement.name,
          description:
            ua.achievement.translations.find((t) => t.locale === 'ru')?.description ??
            ua.achievement.description,
        },
      })),
      ratings: volunteer.taskAssignments.map((ta) => ({
        score: ta.rating!,
        feedback: ta.feedback,
        createdAt: ta.createdAt,
        taskTitle: ta.task.title,
        projectTitle: ta.task.project.title,
      })),
    };

    return NextResponse.json({ volunteer: data });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
