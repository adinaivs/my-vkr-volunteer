import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

async function checkAdmin() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || user.role !== 'admin') return null;
  return user;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!await checkAdmin()) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        category: { include: { translations: true } },
        organizer: {
          select: {
            id: true, firstName: true, lastName: true,
            email: true, phone: true, city: true, avatarUrl: true,
            organizerProfile: {
              select: { organizationName: true, verificationStatus: true },
            },
          },
        },
        tasks: {
          include: {
            skill: true,
            assignments: {
              include: {
                volunteer: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
                report: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        applications: {
          include: {
            volunteer: {
              select: {
                id: true, firstName: true, lastName: true, email: true, avatarUrl: true,
                volunteerProfile: { select: { trustScore: true, completedTasks: true } },
              },
            },
          },
          orderBy: { appliedAt: 'desc' },
        },
        participants: {
          include: {
            volunteer: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
          },
        },
        chat: {
          include: {
            _count: { select: { messages: true, members: true } },
          },
        },
      },
    });

    if (!project) return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });
    return NextResponse.json({ project });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// DELETE - Удалить проект (только для админа)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Проверяем, что пользователь - администратор
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Проверяем, что проект существует
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        organizer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Проект не найден' },
        { status: 404 }
      );
    }

    // Админ может удалять проекты с любым статусом
    await prisma.project.delete({
      where: { id },
    });

    console.log(`Проект "${project.title}" удален администратором ${user.email}`);

    return NextResponse.json({
      message: 'Проект успешно удален',
      deletedProject: {
        id: project.id,
        title: project.title,
        status: project.status,
      },
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Ошибка при удалении проекта' },
      { status: 500 }
    );
  }
}
