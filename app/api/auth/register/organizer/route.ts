import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { generateVerificationCode, sendVerificationCode } from '@/lib/email';

export async function POST(request: NextRequest) {
  console.log('=== Organizer Registration API called ===');
  
  try {
    const body = await request.json();
    console.log('Request body:', { ...body, password: '[HIDDEN]' });
    
    const { 
      email, 
      phone, 
      password, 
      firstName, 
      lastName, 
      organizationName,
      inn,
      okpo,
      verificationDocUrl 
    } = body;

    // Валидация
    if (!email || !phone || !password || !firstName || !lastName || 
        !organizationName || !inn || !okpo) {
      console.log('Validation failed: missing fields');
      return NextResponse.json(
        { error: 'Все поля обязательны' },
        { status: 400 }
      );
    }

    // Проверка ИНН и ОКПО
    if (inn.length !== 14) {
      console.log('Validation failed: INN length', inn.length);
      return NextResponse.json(
        { error: 'ИНН должен содержать 14 цифр' },
        { status: 400 }
      );
    }

    if (okpo.length !== 8) {
      console.log('Validation failed: OKPO length', okpo.length);
      return NextResponse.json(
        { error: 'ОКПО должен содержать 8 цифр' },
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

    console.log('Checking for existing organization...');
    // Проверка существующей организации с таким ИНН
    const existingOrganization = await prisma.organizerProfile.findFirst({
      where: { inn },
    });

    if (existingOrganization) {
      console.log('Organization with this INN already exists');
      return NextResponse.json(
        { error: 'Организация с таким ИНН уже зарегистрирована' },
        { status: 400 }
      );
    }

    console.log('Hashing password...');
    // Хеширование пароля
    const passwordHash = await bcrypt.hash(password, 10);

    // Генерация кода верификации
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 минут
    console.log('Generated verification code:', code);

    console.log('Saving verification token...');
    // Сохранение токена верификации с данными организатора
    await prisma.emailVerificationToken.upsert({
      where: { email },
      create: {
        email,
        code,
        firstName,
        lastName,
        phone,
        passwordHash,
        city: 'Бишкек',
        role: 'organizer',
        organizationName,
        inn,
        okpo,
        legalAddress: 'Не указан',
        actualAddress: 'Не указан',
        verificationDocUrl: verificationDocUrl || null,
        expiresAt,
      },
      update: {
        code,
        firstName,
        lastName,
        phone,
        passwordHash,
        city: 'Бишкек',
        role: 'organizer',
        organizationName,
        inn,
        okpo,
        legalAddress: 'Не указан',
        actualAddress: 'Не указан',
        verificationDocUrl: verificationDocUrl || null,
        expiresAt,
      },
    });

    console.log('Sending verification email...');
    // Отправка email с кодом
    const emailSent = await sendVerificationCode(email, code, 'registration');

    if (!emailSent) {
      console.log('Failed to send email');
      return NextResponse.json(
        { error: 'Ошибка при отправке email' },
        { status: 500 }
      );
    }

    console.log('Organizer registration successful! Code sent to:', email);
    return NextResponse.json(
      {
        message: 'Код подтверждения отправлен на email',
        email,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Organizer registration error:', error);
    return NextResponse.json(
      { error: 'Ошибка при регистрации', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
