import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { id } = await params;
    
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });
    }

    if (project.organizerId !== session.userId) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    // Можно отправить на модерацию только отклоненные проекты
    if (project.status !== 'rejected') {
      return NextResponse.json(
        { error: 'Можно отправить на модерацию только отклоненные проекты' },
        { status: 400 }
      );
    }

    // Отправляем на модерацию
    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        status: 'moderation',
        rejectionReason: null,
        moderatedAt: null,
        moderatedBy: null,
      },
    });

    return NextResponse.json({
      message: 'Проект отправлен на модерацию',
      project: updatedProject,
    });
  } catch (error) {
    console.error('Error resubmitting project:', error);
    return NextResponse.json(
      { error: 'Ошибка при отправке проекта' },
      { status: 500 }
    );
  }
}
