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

    // Поиск токена верификации
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { email },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: 'Токен верификации не найден' },
        { status: 404 }
      );
    }

    // Проверка срока действия
    if (new Date() > verificationToken.expiresAt) {
      await prisma.emailVerificationToken.delete({
        where: { email },
      });
      return NextResponse.json(
        { error: 'Код истек. Пожалуйста, зарегистрируйтесь снова' },
        { status: 400 }
      );
    }

    // Проверка кода
    if (verificationToken.code !== code) {
      return NextResponse.json(
        { error: 'Неверный код' },
        { status: 400 }
      );
    }

    // Создание пользователя
    const user = await prisma.user.create({
      data: {
        email: verificationToken.email,
        phone: verificationToken.phone,
        passwordHash: verificationToken.passwordHash,
        firstName: verificationToken.firstName,
        lastName: verificationToken.lastName,
        city: verificationToken.city,
        role: verificationToken.role,
        status: 'active',
      },
    });

    // Создание профиля в зависимости от роли
    if (user.role === 'volunteer') {
      await prisma.volunteerProfile.create({
        data: {
          userId: user.id,
        },
      });
    } else if (user.role === 'organizer') {
      // Получаем настройку количества бесплатных публикаций
      const freePostsSetting = await prisma.setting.findUnique({
        where: { key: 'default_free_posts' },
      });
      const defaultFreePosts = freePostsSetting ? parseInt(freePostsSetting.value) : 3;
      
      await prisma.organizerProfile.create({
        data: {
          userId: user.id,
          organizationName: verificationToken.organizationName!,
          inn: verificationToken.inn!,
          okpo: verificationToken.okpo!,
          legalAddress: verificationToken.legalAddress || 'Не указан',
          actualAddress: verificationToken.actualAddress || 'Не указан',
          verificationStatus: 'pending',
          verificationDocUrl: verificationToken.verificationDocUrl,
          isApprovedByAdmin: false, // Явно устанавливаем false
          freePostsRemaining: defaultFreePosts, // Устанавливаем из настроек
        },
      });
      console.log('Created organizer profile for user:', user.id, 'with', defaultFreePosts, 'free posts');
    }

    // Удаление токена верификации
    await prisma.emailVerificationToken.delete({
      where: { email },
    });

    // Создание сессии
    await createSession({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        needsVerification: user.role === 'organizer',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'Ошибка при верификации email' },
      { status: 500 }
    );
  }
}
