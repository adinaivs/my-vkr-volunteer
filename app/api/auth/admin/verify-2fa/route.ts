import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSession } from '@/lib/auth';

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

    // Читаем код из БД
    const settingKey = `2fa_code_${email.toLowerCase()}`;
    const setting = await prisma.setting.findUnique({ where: { key: settingKey } });

    if (!setting) {
      return NextResponse.json(
        { error: 'Код не найден. Запросите новый' },
        { status: 401 }
      );
    }

    const storedData = JSON.parse(setting.value) as { code: string; expiresAt: string; userId: string };

    // Проверяем срок действия
    if (new Date() > new Date(storedData.expiresAt)) {
      await prisma.setting.delete({ where: { key: settingKey } });
      return NextResponse.json(
        { error: 'Код истёк. Запросите новый' },
        { status: 401 }
      );
    }

    // Проверяем совпадение кода
    if (storedData.code !== String(code)) {
      return NextResponse.json(
        { error: 'Неверный код подтверждения' },
        { status: 401 }
      );
    }

    // Удаляем использованный код
    await prisma.setting.delete({ where: { key: settingKey } });

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
