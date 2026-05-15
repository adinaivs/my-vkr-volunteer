import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';
import { checkAchievementsOnApplicationApproved } from '@/lib/achievements';

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

    const { status, rejectionReason } = await request.json();

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Неверный статус' }, { status: 400 });
    }

    // Если отклоняем, причина обязательна
    if (status === 'rejected' && !rejectionReason?.trim()) {
      return NextResponse.json({ 
        error: 'Необходимо указать причину отклонения' 
      }, { status: 400 });
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
        volunteer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!application) {
      return NextResponse.json({ error: 'Заявка не найдена' }, { status: 404 });
    }

    if (application.status !== 'pending') {
      return NextResponse.json({ error: 'Заявка уже обработана' }, { status: 400 });
    }

    // Проверяем, что проект в статусе recruiting
    if (application.project.status !== 'recruiting') {
      return NextResponse.json({ 
        error: 'Можно обрабатывать заявки только для проектов в статусе "Набор волонтеров"' 
      }, { status: 400 });
    }

    // Если одобряем, проверяем лимит волонтеров
    if (status === 'approved') {
      if (application.project.currentVolunteers >= application.project.maxVolunteers) {
        return NextResponse.json({ 
          error: 'Достигнуто максимальное количество волонтеров' 
        }, { status: 400 });
      }

      // Проверяем, не является ли волонтер уже участником
      const existingParticipant = await prisma.projectParticipant.findUnique({
        where: {
          projectId_volunteerId: {
            projectId: application.projectId,
            volunteerId: application.volunteerId
          }
        }
      });

      if (existingParticipant) {
        return NextResponse.json({ 
          error: 'Волонтер уже является участником проекта' 
        }, { status: 400 });
      }
    }

    // Обновляем статус заявки
    const updatedApplication = await prisma.application.update({
      where: { id: applicationId },
      data: { 
        status,
        rejectionReason: status === 'rejected' ? rejectionReason : null,
        reviewedBy: user.id,
        reviewedAt: new Date()
      }
    });

    // Если заявка одобрена, создаем ProjectParticipant
    if (status === 'approved') {
      // Создаем участника проекта
      await prisma.projectParticipant.create({
        data: {
          projectId: application.projectId,
          volunteerId: application.volunteerId,
          joinedAt: new Date()
        }
      });

      // Увеличиваем счетчик волонтеров в проекте
      await prisma.project.update({
        where: { id: application.projectId },
        data: {
          currentVolunteers: {
            increment: 1
          }
        }
      });

      // НЕ создаем TaskAssignment - это будет делаться отдельно!

      // Проверяем и выдаём достижения волонтёру
      checkAchievementsOnApplicationApproved(application.volunteerId, application.projectId).catch(console.error);
    }

    // Если заявка отклонена, отправляем email волонтеру
    if (status === 'rejected') {
      try {
        // Отправляем email с причиной отклонения
        const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/email/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: application.volunteer.email,
            subject: `Заявка на проект "${application.project.title}" отклонена`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #dc2626;">Заявка отклонена</h2>
                <p>Здравствуйте, ${application.volunteer.firstName}!</p>
                <p>К сожалению, ваша заявка на участие в проекте <strong>"${application.project.title}"</strong> была отклонена.</p>
                <div style="background-color: #fee; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #dc2626;">Причина отклонения:</h3>
                  <p style="margin-bottom: 0;">${rejectionReason}</p>
                </div>
                <p>Не расстраивайтесь! Вы можете подать заявку на другие проекты на нашей платформе.</p>
                <p style="margin-top: 30px;">
                  <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/volunteer/projects" 
                     style="background-color: #00CC00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
                    Посмотреть другие проекты
                  </a>
                </p>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 12px;">
                  С уважением,<br>
                  Команда ВолонтёрКР
                </p>
              </div>
            `,
          }),
        });

        if (!emailResponse.ok) {
          console.error('Failed to send rejection email:', await emailResponse.text());
        }
      } catch (emailError) {
        console.error('Error sending rejection email:', emailError);
        // Не прерываем выполнение, если email не отправился
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