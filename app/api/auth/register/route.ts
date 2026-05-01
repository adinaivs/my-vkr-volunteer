import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { generateVerificationCode, sendVerificationCode } from '@/lib/email';

export async function POST(request: NextRequest) {
  console.log('=== Register API called ===');
  
  try {
    const body = await request.json();
    console.log('Request body:', { ...body, password: '[HIDDEN]' });
    
    const { email, phone, password, firstName, lastName, city, role } = body;

    // Валидация
    if (!email || !phone || !password || !firstName || !lastName || !city || !role) {
      console.log('Validation failed: missing fields');
      return NextResponse.json(
        { error: 'Все поля обязательны' },
        { status: 400 }
      );
    }

    if (!['volunteer', 'organizer'].includes(role)) {
      console.log('Validation failed: invalid role');
      return NextResponse.json(
        { error: 'Неверная роль' },
        { status: 400 }
      );
    }

    console.log('Checking for existing user...');
    // Проверка существующего пользователя
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone }],
      },
    });

    if (existingUser) {
      console.log('User already exists');
      return NextResponse.json(
        { error: 'Пользователь с таким email или телефоном уже существует' },
        { status: 400 }
      );
    }

    console.log('Hashing password...');
    // Хеширование пароля
    const passwordHash = await bcrypt.hash(password, 10);

    // Генерация кода верификации
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 минут

    console.log('Saving verification token...');
    // Сохранение токена верификации
    await prisma.emailVerificationToken.upsert({
      where: { email },
      create: {
        email,
        code,
        firstName,
        lastName,
        phone,
        passwordHash,
        city,
        role: role as 'volunteer' | 'organizer',
        expiresAt,
      },
      update: {
        code,
        firstName,
        lastName,
        phone,
        passwordHash,
        city,
        role: role as 'volunteer' | 'organizer',
        expiresAt,
      },
    });

    console.log('Sending verification email...');
    // Отправка email с кодом
    const emailSent = await sendVerificationCode(email, code, 'registration');

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Ошибка при отправке email' },
        { status: 500 }
      );
    }

    console.log('Verification code sent successfully!');
    return NextResponse.json(
      {
        message: 'Код подтверждения отправлен на email',
        email,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Ошибка при регистрации', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
