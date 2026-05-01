import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Проверяем авторизацию
    const session = await getSession();

    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      );
    }

    // Получаем статистику
    const [
      totalUsers,
      totalVolunteers,
      totalOrganizers,
      activeProjects,
      pendingVerifications,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'volunteer' } }),
      prisma.user.count({ where: { role: 'organizer' } }),
      prisma.project.count({ where: { status: 'published' } }),
      prisma.organizerProfile.count({ where: { verificationStatus: 'pending' } }),
    ]);

    return NextResponse.json({
      totalUsers,
      totalVolunteers,
      totalOrganizers,
      activeProjects,
      pendingVerifications,
    });
  } catch (error) {
    console.error('Statistics error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
