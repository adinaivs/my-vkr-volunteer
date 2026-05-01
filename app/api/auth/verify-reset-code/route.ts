import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email и код обязательны' },
        { status: 400 }
      );
    }

    // Поиск токена
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { email },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: 'Токен не найден' },
        { status: 404 }
      );
    }

    // Проверка срока действия
    if (new Date() > resetToken.expiresAt) {
      await prisma.passwordResetToken.delete({
        where: { email },
      });
      return NextResponse.json(
        { error: 'Код истек. Пожалуйста, запросите новый код' },
        { status: 400 }
      );
    }

    // Проверка кода
    if (resetToken.code !== code) {
      return NextResponse.json(
        { error: 'Неверный код' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Код подтвержден', valid: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('Verify reset code error:', error);
    return NextResponse.json(
      { error: 'Ошибка при проверке кода' },
      { status: 500 }
    );
  }
}
