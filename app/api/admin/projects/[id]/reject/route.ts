import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getCategoryInclude, formatCategoryWithTranslation } from '@/lib/category-helpers';
import { sendProjectRejectionEmail } from '@/lib/email';

// POST - Отклонить проект
export async function POST(
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
    const body = await request.json();
    const { reason } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Необходимо указать причину отклонения' },
        { status: 400 }
      );
    }

    // Получаем проект
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

    // Проверяем, что проект на модерации
    if (project.status !== 'moderation') {
      return NextResponse.json(
        { error: 'Можно отклонять только проекты на модерации' },
        { status: 400 }
      );
    }

    // Отклоняем проект
    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectionReason: reason,
        moderatedAt: new Date(),
        moderatedBy: user.id,
      },
      include: {
        ...getCategoryInclude('ru'),
        organizer: {
          select: {
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
      },
    });

    // Отправляем email организатору об отклонении проекта
    const organizerName = `${project.organizer.firstName} ${project.organizer.lastName}`;
    await sendProjectRejectionEmail(
      project.organizer.email,
      organizerName,
      project.title,
      reason
    );

    console.log(`Проект "${project.title}" отклонен администратором ${user.email}. Причина: ${reason}`);

    return NextResponse.json({
      message: 'Проект отклонен',
      project: {
        ...updatedProject,
        category: formatCategoryWithTranslation(updatedProject.category)
      },
    });
  } catch (error) {
    console.error('Error rejecting project:', error);
    return NextResponse.json(
      { error: 'Ошибка при отклонении проекта' },
      { status: 500 }
    );
  }
}
