import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Проверяем авторизацию
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    
    // Проверяем, что пользователь существует
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    // Получаем всех волонтеров
    const volunteers = await prisma.user.findMany({
      where: {
        role: 'volunteer'
      },
      include: {
        volunteerProfile: true,
        skills: {
          include: {
            skill: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Форматируем данные
    const formattedVolunteers = volunteers.map(volunteer => ({
      id: volunteer.id,
      firstName: volunteer.firstName,
      lastName: volunteer.lastName,
      email: volunteer.email,
      phone: volunteer.phone,
      avatarUrl: volunteer.avatarUrl,
      city: volunteer.city,
      volunteerProfile: volunteer.volunteerProfile ? {
        bio: volunteer.volunteerProfile.bio,
        trustScore: volunteer.volunteerProfile.trustScore,
        completedTasks: volunteer.volunteerProfile.completedTasks,
        completedProjects: volunteer.volunteerProfile.completedProjects
      } : null,
      skills: volunteer.skills.map(us => ({
        id: us.skill.id,
        name: us.skill.name
      }))
    }));

    return NextResponse.json({ volunteers: formattedVolunteers });
  } catch (error) {
    console.error('Error fetching volunteers:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}