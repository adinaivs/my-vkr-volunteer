import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { sendOrganizerApprovalEmail } from '@/lib/email';

// POST - Подтвердить организатора
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Проверяем, что пользователь - админ
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    const { id } = await params;

    // Получаем текущий профиль организатора
    const currentProfile = await prisma.organizerProfile.findUnique({
      where: { userId: id },
    });

    if (!currentProfile) {
      return NextResponse.json(
        { error: 'Профиль организатора не найден' },
        { status: 404 }
      );
    }

    // Получаем настройку количества бесплатных публикаций только если у организатора еще нет установленного значения
    // или если значение равно дефолтному из схемы (3)
    let freePostsToSet = currentProfile.freePostsRemaining;
    
    // Если у организатора дефолтное значение из схемы, обновляем его на актуальное из настроек
    if (currentProfile.freePostsRemaining === 3) {
      const freePostsSetting = await prisma.setting.findUnique({
        where: { key: 'default_free_posts' },
      });
      freePostsToSet = freePostsSetting ? parseInt(freePostsSetting.value) : 3;
    }

    // Обновляем статус организатора
    const organizerProfile = await prisma.organizerProfile.update({
      where: { userId: id },
      data: {
        isApprovedByAdmin: true,
        approvedAt: new Date(),
        isRejected: false,
        rejectedAt: null,
        rejectionReason: null,
        freePostsRemaining: freePostsToSet,
      },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Отправляем email уведомление
    try {
      await sendOrganizerApprovalEmail(
        organizerProfile.user.email,
        organizerProfile.organizationName,
        organizerProfile.user.firstName
      );
      console.log('Approval email sent successfully');
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError);
      // Не возвращаем ошибку, так как основная операция выполнена
    }

    return NextResponse.json({
      message: 'Организатор успешно подтвержден. Уведомление отправлено на email.',
      organizer: organizerProfile,
    });
  } catch (error) {
    console.error('Error approving organizer:', error);
    return NextResponse.json(
      { error: 'Ошибка при подтверждении организатора' },
      { status: 500 }
    );
  }
}
