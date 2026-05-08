import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/organizer/projects/[id]/participants - Получить список участников проекта
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;

    // Проверяем существование проекта
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { organizerId: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Проект не найден' },
        { status: 404 }
      );
    }

    // Проверяем права доступа (только организатор проекта или админ)
    if (session.role !== 'admin' && project.organizerId !== session.userId) {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      );
    }

    // Получаем список активных участников
    const participants = await prisma.projectParticipant.findMany({
      where: {
        projectId,
        isActive: true,
      },
      include: {
        volunteer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatarUrl: true,
            city: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    // Для каждого участника получаем количество назначенных задач
    const participantsWithTasks = await Promise.all(
      participants.map(async (participant) => {
        const assignedTasksCount = await prisma.taskAssignment.count({
          where: {
            volunteerId: participant.volunteerId,
            task: {
              projectId,
            },
            status: {
              in: ['assigned', 'completed', 'confirmed'],
            },
          },
        });

        return {
          id: participant.id,
          volunteerId: participant.volunteer.id,
          firstName: participant.volunteer.firstName,
          lastName: participant.volunteer.lastName,
          email: participant.volunteer.email,
          phone: participant.volunteer.phone,
          avatarUrl: participant.volunteer.avatarUrl,
          city: participant.volunteer.city,
          joinedAt: participant.joinedAt,
          isActive: participant.isActive,
          notes: participant.notes,
          assignedTasksCount,
        };
      })
    );

    return NextResponse.json(participantsWithTasks);
  } catch (error) {
    console.error('Error fetching participants:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении списка участников' },
      { status: 500 }
    );
  }
}
