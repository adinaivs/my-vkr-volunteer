import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/volunteer/saved-projects
// Возвращает список сохранённых проектов текущего волонтёра
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || user.role !== 'volunteer') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const locale = request.nextUrl.searchParams.get('locale') || 'ru';

    const saved = await prisma.savedProject.findMany({
      where: { userId: session.userId },
      orderBy: { savedAt: 'desc' },
      include: {
        project: {
          include: {
            category: {
              include: {
                translations: {
                  where: { locale: locale === 'kg' ? 'kg' : 'ru' },
                },
              },
            },
            organizer: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true,
                organizerProfile: { select: { organizationName: true } },
              },
            },
          },
        },
      },
    });

    const projects = saved.map(({ project, savedAt }) => ({
      id: project.id,
      title: project.title,
      description: project.description,
      imageUrl: project.imageUrl,
      location: project.location,
      startDate: project.startDate,
      endDate: project.endDate,
      maxVolunteers: project.maxVolunteers,
      currentVolunteers: project.currentVolunteers,
      status: project.status,
      savedAt,
      category: {
        id: project.category.id,
        slug: project.category.slug,
        icon: project.category.icon,
        name: project.category.translations[0]?.name ?? project.category.slug,
      },
      organizer: {
        firstName: project.organizer.firstName,
        lastName: project.organizer.lastName,
        avatarUrl: project.organizer.avatarUrl,
        organizationName: project.organizer.organizerProfile?.organizationName ?? null,
      },
    }));

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Ошибка при получении сохранённых проектов:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
