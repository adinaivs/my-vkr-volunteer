import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSession } from '@/lib/auth';
import { twoFactorCodes } from '../login/route';

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

    // Проверяем код
    const storedData = twoFactorCodes.get(email);

    if (!storedData) {
      return NextResponse.json(
        { error: 'Код не найден. Запросите новый' },
        { status: 401 }
      );
    }

    // Проверяем срок действия
    if (new Date() > storedData.expiresAt) {
      twoFactorCodes.delete(email);
      return NextResponse.json(
        { error: 'Код истек. Запросите новый' },
        { status: 401 }
      );
    }

    // Проверяем совпадение кода
    if (storedData.code !== code) {
      return NextResponse.json(
        { error: 'Неверный код подтверждения' },
        { status: 401 }
      );
    }

    // Удаляем использованный код
    twoFactorCodes.delete(email);

    // Получаем пользователя
    const user = await prisma.user.findUnique({
      where: { id: storedData.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
      },
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Пользователь не найден или не является администратором' },
        { status: 403 }
      );
    }

    // Создаем сессию
    await createSession({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
