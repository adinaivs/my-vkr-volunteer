import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getCategoryInclude, formatCategoryWithTranslation } from '@/lib/category-helpers';

// GET /api/volunteer/my-projects - Получить проекты волонтера
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Проверяем, что пользователь - волонтер
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user || user.role !== 'volunteer') {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'active', 'completed', 'upcoming'

    // Получаем проекты где волонтер является участником
    const participants = await prisma.projectParticipant.findMany({
      where: {
        volunteerId: user.id,
        isActive: true,
      },
      include: {
        project: {
          include: {
            ...getCategoryInclude('ru'),
            organizer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                organizerProfile: {
                  select: {
                    organizationName: true,
                  },
                },
              },
            },
            tasks: {
              include: {
                skill: true,
                assignments: {
                  where: {
                    volunteerId: user.id,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        joinedAt: 'desc',
      },
    });

    // Фильтруем проекты по типу
    let filteredProjects = participants.map(p => p.project);

    if (type === 'active') {
      filteredProjects = filteredProjects.filter(
        p => ['recruiting', 'upcoming', 'active'].includes(p.status)
      );
    } else if (type === 'completed') {
      filteredProjects = filteredProjects.filter(
        p => p.status === 'completed'
      );
    } else if (type === 'upcoming') {
      filteredProjects = filteredProjects.filter(
        p => p.status === 'upcoming'
      );
    }

    // Форматируем данные
    const projectsData = filteredProjects.map(project => {
      // Подсчитываем назначенные задачи волонтера
      const myTasks = project.tasks.filter(task => 
        task.assignments.some(a => a.volunteerId === user.id)
      );

      const completedTasks = myTasks.filter(task =>
        task.assignments.some(a => 
          a.volunteerId === user.id && 
          ['completed', 'confirmed'].includes(a.status)
        )
      );

      return {
        ...project,
        latitude: project.latitude ? parseFloat(project.latitude.toString()) : null,
        longitude: project.longitude ? parseFloat(project.longitude.toString()) : null,
        category: formatCategoryWithTranslation(project.category),
        myTasksCount: myTasks.length,
        completedTasksCount: completedTasks.length,
        myTasks: myTasks.map(task => ({
          ...task,
          assignmentStatus: task.assignments[0]?.status,
          assignedAt: task.assignments[0]?.createdAt,
        })),
      };
    });

    return NextResponse.json({ projects: projectsData });
  } catch (error) {
    console.error('Error fetching volunteer projects:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении проектов' },
      { status: 500 }
    );
  }
}
