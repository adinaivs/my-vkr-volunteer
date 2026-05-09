import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') || 'all';
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';
    const city = searchParams.get('city') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const orgStatus = searchParams.get('orgStatus') || 'all'; // approved | pending | rejected
    const sort = searchParams.get('sort') || 'newest'; // newest | oldest | name_asc | name_desc
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = 20;
    const offset = (page - 1) * limit;

    const where: any = {
      role: { not: 'admin' },
      ...(role !== 'all' ? { role } : {}),
      ...(status !== 'all' ? { status } : {}),
      ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo + 'T23:59:59') } : {}),
            },
          }
        : {}),
      ...(orgStatus !== 'all' && role === 'organizer'
        ? {
            organizerProfile:
              orgStatus === 'approved'
                ? { isApprovedByAdmin: true }
                : orgStatus === 'rejected'
                ? { isRejected: true }
                : { isApprovedByAdmin: false, isRejected: false },
          }
        : {}),
    };

    const orderBy: any =
      sort === 'oldest'
        ? { createdAt: 'asc' }
        : sort === 'name_asc'
        ? [{ firstName: 'asc' }, { lastName: 'asc' }]
        : sort === 'name_desc'
        ? [{ firstName: 'desc' }, { lastName: 'desc' }]
        : { createdAt: 'desc' };

    const [users, total, cities] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          city: true,
          avatarUrl: true,
          createdAt: true,
          volunteerProfile: {
            select: { completedTasks: true, completedProjects: true, trustScore: true },
          },
          organizerProfile: {
            select: {
              organizationName: true,
              isApprovedByAdmin: true,
              isRejected: true,
              verificationStatus: true,
              freePostsRemaining: true,
            },
          },
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.user.count({ where }),
      prisma.user.findMany({
        where: { role: { not: 'admin' } },
        select: { city: true },
        distinct: ['city'],
        orderBy: { city: 'asc' },
      }),
    ]);

    return NextResponse.json({
      users,
      total,
      page,
      pages: Math.ceil(total / limit),
      cities: cities.map((c) => c.city).filter(Boolean),
    });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
