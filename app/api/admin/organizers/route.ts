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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'date-desc';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status === 'pending') {
      where.isApprovedByAdmin = false;
      where.isRejected = false;
    } else if (status === 'approved') {
      where.isApprovedByAdmin = true;
    } else if (status === 'rejected') {
      where.isRejected = true;
    }

    if (search) {
      where.OR = [
        { organizationName: { contains: search, mode: 'insensitive' } },
        { inn: { contains: search, mode: 'insensitive' } },
        { okpo: { contains: search, mode: 'insensitive' } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { phone: { contains: search, mode: 'insensitive' } } },
      ];
    }

    let orderBy: any = { user: { createdAt: 'desc' } };
    switch (sortBy) {
      case 'date-asc': orderBy = { user: { createdAt: 'asc' } }; break;
      case 'name-asc': orderBy = { organizationName: 'asc' }; break;
      case 'name-desc': orderBy = { organizationName: 'desc' }; break;
      default: orderBy = { user: { createdAt: 'desc' } };
    }

    const include = {
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
    };

    const [total, organizers] = await Promise.all([
      prisma.organizerProfile.count({ where }),
      prisma.organizerProfile.findMany({ where, include, orderBy, skip, take: limit }),
    ]);

    return NextResponse.json({
      organizers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching organizers:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении списка организаторов' },
      { status: 500 }
    );
  }
}
