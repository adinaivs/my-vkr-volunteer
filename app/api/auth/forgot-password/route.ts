import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateVerificationCode, sendVerificationCode } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email обязателен' },
        { status: 400 }
      );
    }

    // Проверка существования пользователя
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Не раскрываем информацию о существовании пользователя
      return NextResponse.json(
        { message: 'Если пользователь с таким email существует, код был отправлен' },
        { status: 200 }
      );
    }

    // Генерация кода
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 минут

    // Сохранение токена
    await prisma.passwordResetToken.upsert({
      where: { email },
      create: {
        email,
        code,
        expiresAt,
      },
      update: {
        code,
        expiresAt,
      },
    });

    // Отправка email
    const emailSent = await sendVerificationCode(email, code, 'password-reset');

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Ошибка при отправке email' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Код восстановления отправлен на email' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Ошибка при восстановлении пароля' },
      { status: 500 }
    );
  }
}
