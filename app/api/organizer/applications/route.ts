import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession, getAuthenticatedUser } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Проверяем авторизацию
    const session = await getAuthenticatedUser();
    
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }
    
    // Проверяем, что пользователь - организатор
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { organizerProfile: true }
    });

    if (!user || user.role !== 'organizer') {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    let whereClause: any = {
      project: {
        organizerId: user.id
      }
    };

    // Если указан конкретный проект, фильтруем по нему
    if (projectId) {
      whereClause.projectId = projectId;
    }

    // Получаем заявки
    const applications = await prisma.application.findMany({
      where: whereClause,
      include: {
        volunteer: {
          include: {
            skills: {
              include: {
                skill: true
              }
            }
          }
        },
        project: {
          select: {
            id: true,
            title: true
          }
        },
        task: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        appliedAt: 'desc'
      }
    });

    // Форматируем данные
    const formattedApplications = applications.map(app => ({
      id: app.id,
      status: app.status,
      appliedAt: app.appliedAt,
      message: app.message,
      volunteer: {
        id: app.volunteer.id,
        firstName: app.volunteer.firstName,
        lastName: app.volunteer.lastName,
        email: app.volunteer.email,
        avatarUrl: app.volunteer.avatarUrl,
        skills: app.volunteer.skills.map(us => ({
          id: us.skill.id,
          name: us.skill.name
        }))
      },
      project: app.project,
      task: app.task
    }));

    return NextResponse.json({ applications: formattedApplications });
  } catch (error) {
    console.error('Error fetching applications:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}