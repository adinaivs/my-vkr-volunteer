import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, getAuthenticatedUser } from '@/lib/auth';

// GET - Проверка статуса заявки волонтера на проект
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthenticatedUser();
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { id: projectId } = await params;

    // Проверяем, есть ли заявка от этого волонтера на этот проект
    const application = await prisma.application.findFirst({
      where: {
        projectId,
        volunteerId: session.userId,
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });

    if (application) {
      return NextResponse.json({
        hasApplied: true,
        status: application.status,
        appliedAt: application.createdAt,
      });
    }

    return NextResponse.json({
      hasApplied: false,
    });
  } catch (error) {
    console.error('Error checking application status:', error);
    return NextResponse.json(
      { error: 'Ошибка при проверке статуса заявки' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthenticatedUser();
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Проверяем, что пользователь - волонтер
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user || user.role !== 'volunteer') {
      return NextResponse.json(
        { error: 'Только волонтеры могут подавать заявки' },
        { status: 403 }
      );
    }

    const { id: projectId } = await params;
    const body = await request.json();
    const { motivation, phone, email, skills, experience, availability } = body;

    // Валидация
    if (!motivation || motivation.trim().length < 50) {
      return NextResponse.json(
        { error: 'Причина участия должна содержать минимум 50 символов' },
        { status: 400 }
      );
    }

    if (!phone || !email) {
      return NextResponse.json(
        { error: 'Необходимо указать контактные данные' },
        { status: 400 }
      );
    }

    // Проверяем, существует ли проект
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });
    }

    // Проверяем, что проект в статусе набора волонтеров
    if (project.status !== 'recruiting') {
      return NextResponse.json(
        { error: 'Проект недоступен для подачи заявок' },
        { status: 400 }
      );
    }

    // Проверяем, что проект не завершен
    const endDate = new Date(project.endDate);
    if (endDate < new Date()) {
      return NextResponse.json(
        { error: 'Проект уже завершен' },
        { status: 400 }
      );
    }

    // Проверяем, что есть свободные места
    if (project.currentVolunteers >= project.maxVolunteers) {
      return NextResponse.json(
        { error: 'В проекте нет свободных мест' },
        { status: 400 }
      );
    }

    // Проверяем, не подавал ли волонтер уже заявку на этот проект
    const existingApplication = await prisma.application.findFirst({
      where: {
        projectId,
        volunteerId: user.id,
      },
    });

    if (existingApplication) {
      return NextResponse.json(
        { error: 'Вы уже подали заявку на этот проект' },
        { status: 400 }
      );
    }

    // Получаем названия навыков, если они указаны
    let skillNames: string[] = [];
    if (skills && Array.isArray(skills) && skills.length > 0) {
      console.log('Received skills IDs:', skills);
      const skillsData = await prisma.skill.findMany({
        where: {
          id: {
            in: skills,
          },
        },
        select: {
          name: true,
        },
      });
      skillNames = skillsData.map(skill => skill.name);
      console.log('Skill names:', skillNames);
    }

    // Формируем сообщение с полной информацией о заявке
    const applicationMessage = `
МОТИВАЦИЯ:
${motivation}

КОНТАКТЫ:
Телефон: ${phone}
Email: ${email}

${experience ? `ОПЫТ ВОЛОНТЕРСТВА:\n${experience}\n\n` : ''}${availability ? `ДОСТУПНОСТЬ:\n${availability}\n\n` : ''}${skillNames.length > 0 ? `НАВЫКИ:\n${skillNames.join(', ')}` : ''}
    `.trim();

    // Создаем заявку
    const application = await prisma.application.create({
      data: {
        projectId,
        volunteerId: user.id,
        message: applicationMessage,
        status: 'pending',
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
            volunteerProfile: {
              select: {
                bio: true,
                trustScore: true,
                completedTasks: true,
                completedProjects: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Заявка успешно отправлена',
      application: {
        id: application.id,
        status: application.status,
        createdAt: application.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating application:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании заявки' },
      { status: 500 }
    );
  }
}
