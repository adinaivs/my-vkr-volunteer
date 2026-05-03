import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET - Получить список организаторов для проверки
export async function GET(request: NextRequest) {
  try {
    // Проверяем авторизацию через getSession
    const session = await getSession();

    if (!session) {
      console.log('No session found');
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    console.log('Session found:', session);

    // Проверяем, что пользователь - админ
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user || user.role !== 'admin') {
      console.log('User is not admin:', user?.role);
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    console.log('Admin verified:', user.email);

    // Получаем параметры фильтрации
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all'; // all, pending, approved, rejected

    // Формируем условия фильтрации
    const where: any = {};
    
    if (status === 'pending') {
      where.isApprovedByAdmin = false;
      where.isRejected = false;
    } else if (status === 'approved') {
      where.isApprovedByAdmin = true;
    } else if (status === 'rejected') {
      where.isRejected = true;
    }

    // Получаем организаторов
    const organizers = await prisma.organizerProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            city: true,
            createdAt: true,
            status: true,
          },
        },
      },
      orderBy: {
        user: {
          createdAt: 'desc',
        },
      },
    });

    console.log('Fetching organizers with status:', status);
    console.log('Where condition:', where);
    console.log('Found organizers:', organizers.length);
    
    // Логируем первого организатора для проверки
    if (organizers.length > 0) {
      console.log('First organizer verificationDocUrl:', organizers[0].verificationDocUrl);
    }

    return NextResponse.json({ organizers });
  } catch (error) {
    console.error('Error fetching organizers:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении списка организаторов' },
      { status: 500 }
    );
  }
}
