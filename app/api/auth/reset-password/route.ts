import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code, newPassword } = body;

    if (!email || !code || !newPassword) {
      return NextResponse.json(
        { error: 'Email, код и новый пароль обязательны' },
        { status: 400 }
      );
    }

    // Проверка длины пароля
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Пароль должен содержать минимум 6 символов' },
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

    // Хеширование нового пароля
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Обновление пароля пользователя
    await prisma.user.update({
      where: { email },
      data: { passwordHash },
    });

    // Удаление токена
    await prisma.passwordResetToken.delete({
      where: { email },
    });

    return NextResponse.json(
      { message: 'Пароль успешно изменен' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Ошибка при сбросе пароля' },
      { status: 500 }
    );
  }
}
