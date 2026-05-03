import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { sendOrganizerRejectionEmail } from '@/lib/email';

// POST - Отклонить организатора
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
    const body = await request.json();
    const { reason } = body;

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Необходимо указать причину отклонения' },
        { status: 400 }
      );
    }

    // Обновляем статус организатора
    const organizerProfile = await prisma.organizerProfile.update({
      where: { userId: id },
      data: {
        isApprovedByAdmin: false,
        isRejected: true,
        rejectedAt: new Date(),
        rejectionReason: reason,
        verificationComment: reason,
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
      await sendOrganizerRejectionEmail(
        organizerProfile.user.email,
        organizerProfile.organizationName,
        organizerProfile.user.firstName,
        reason
      );
      console.log('Rejection email sent successfully');
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
      // Не возвращаем ошибку, так как основная операция выполнена
    }

    return NextResponse.json({
      message: 'Организатор отклонен. Уведомление отправлено на email.',
      organizer: organizerProfile,
    });
  } catch (error) {
    console.error('Error rejecting organizer:', error);
    return NextResponse.json(
      { error: 'Ошибка при отклонении организатора' },
      { status: 500 }
    );
  }
}
