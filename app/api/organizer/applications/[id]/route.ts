import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';

const prisma = new PrismaClient();

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params в Next.js 16
    const { id: applicationId } = await params;
    
    // Проверяем авторизацию
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }
    
    // Проверяем, что пользователь - организатор
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { organizerProfile: true }
    });

    if (!user || user.role !== 'organizer') {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    const { status } = await request.json();

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Неверный статус' }, { status: 400 });
    }

    // Проверяем, что заявка существует и принадлежит проекту организатора
    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        project: {
          organizerId: user.id
        }
      },
      include: {
        project: true,
        task: true
      }
    });

    if (!application) {
      return NextResponse.json({ error: 'Заявка не найдена' }, { status: 404 });
    }

    if (application.status !== 'pending') {
      return NextResponse.json({ error: 'Заявка уже обработана' }, { status: 400 });
    }

    // Обновляем статус заявки
    const updatedApplication = await prisma.application.update({
      where: { id: applicationId },
      data: { 
        status,
        reviewedAt: new Date()
      }
    });

    // Если заявка одобрена, увеличиваем счетчик волонтеров
    if (status === 'approved') {
      // Увеличиваем счетчик волонтеров в проекте
      await prisma.project.update({
        where: { id: application.projectId },
        data: {
          currentVolunteers: {
            increment: 1
          }
        }
      });

      // Если заявка была на конкретную задачу, увеличиваем счетчик и для задачи
      if (application.taskId) {
        await prisma.task.update({
          where: { id: application.taskId },
          data: {
            currentVolunteers: {
              increment: 1
            }
          }
        });
      }
    }

    return NextResponse.json({ 
      message: `Заявка ${status === 'approved' ? 'одобрена' : 'отклонена'}`,
      application: updatedApplication 
    });
  } catch (error) {
    console.error('Error updating application:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}