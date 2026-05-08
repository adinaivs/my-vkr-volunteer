import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Временное хранилище кодов 2FA (в продакшене использовать Redis)
const twoFactorCodes = new Map<string, { code: string; expiresAt: Date; userId: string }>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email и пароль обязательны' },
        { status: 400 }
      );
    }

    // Проверяем пользователя
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      );
    }

    // Проверяем роль администратора
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'У вас нет прав администратора' },
        { status: 403 }
      );
    }

    // Проверяем пароль
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      );
    }

    // Получаем настройки Telegram из базы данных
    const telegramBotToken = await prisma.setting.findUnique({
      where: { key: 'ADMIN_TELEGRAM_BOT_TOKEN' },
    });

    const telegramUserId = await prisma.setting.findUnique({
      where: { key: 'ADMIN_TELEGRAM_USER_ID' },
    });

    if (!telegramBotToken || !telegramUserId) {
      return NextResponse.json(
        { error: 'Telegram не настроен для администратора' },
        { status: 500 }
      );
    }

    // Генерируем 6-значный код
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 минут

    // Сохраняем код
    twoFactorCodes.set(email, { code, expiresAt, userId: user.id });

    // Отправляем код в Telegram
    try {
      const telegramResponse = await fetch(
        `https://api.telegram.org/bot${telegramBotToken.value}/sendMessage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: telegramUserId.value,
            text: `🔐 Код для входа в админ-панель ВолонтёрКР:\n\n${code}\n\nКод действителен 5 минут.`,
            parse_mode: 'HTML',
          }),
        }
      );

      if (!telegramResponse.ok) {
        const errorData = await telegramResponse.json();
        console.error('Telegram API error:', errorData);
        throw new Error(`Telegram API: ${errorData.description || 'Unknown error'}`);
      }
    } catch (telegramError) {
      console.error('Telegram error:', telegramError);
      
      // Если это ошибка сети или Telegram недоступен, возвращаем более понятное сообщение
      const errorMessage = telegramError instanceof Error 
        ? telegramError.message 
        : 'Ошибка отправки кода в Telegram';
      
      return NextResponse.json(
        { error: `Не удалось отправить код: ${errorMessage}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Код отправлен в Telegram',
      requiresTwoFactor: true,
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}

// Экспортируем Map для использования в verify endpoint
export { twoFactorCodes };
