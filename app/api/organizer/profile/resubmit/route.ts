import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// POST - Повторная отправка данных организатора на проверку
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Проверяем, что пользователь - организатор
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        organizerProfile: true,
      },
    });

    if (!user || user.role !== 'organizer') {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    if (!user.organizerProfile) {
      return NextResponse.json(
        { error: 'Профиль организатора не найден' },
        { status: 404 }
      );
    }

    // Проверяем, что организатор был отклонен
    if (!user.organizerProfile.isRejected) {
      return NextResponse.json(
        { error: 'Ваша заявка не была отклонена' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      phone,
      city,
      organizationName,
      inn,
      okpo,
      legalAddress,
      actualAddress,
      verificationDocUrl,
    } = body;

    // Валидация
    if (
      !firstName ||
      !lastName ||
      !phone ||
      !city ||
      !organizationName ||
      !inn ||
      !okpo ||
      !legalAddress ||
      !actualAddress
    ) {
      return NextResponse.json(
        { error: 'Все обязательные поля должны быть заполнены' },
        { status: 400 }
      );
    }

    // Обновляем данные пользователя
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        firstName,
        lastName,
        phone,
        city,
      },
    });

    // Обновляем профиль организатора и сбрасываем статус отклонения
    const updatedProfile = await prisma.organizerProfile.update({
      where: { userId: session.userId },
      data: {
        organizationName,
        inn,
        okpo,
        legalAddress,
        actualAddress,
        verificationDocUrl: verificationDocUrl || user.organizerProfile.verificationDocUrl,
        // Сбрасываем статус отклонения и возвращаем на проверку
        isRejected: false,
        rejectedAt: null,
        rejectionReason: null,
        isApprovedByAdmin: false,
        approvedAt: null,
        verificationStatus: 'pending',
        verificationComment: null,
      },
    });

    return NextResponse.json({
      message: 'Данные успешно обновлены и отправлены на повторную проверку',
      profile: updatedProfile,
    });
  } catch (error) {
    console.error('Error resubmitting organizer profile:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении данных' },
      { status: 500 }
    );
  }
}
