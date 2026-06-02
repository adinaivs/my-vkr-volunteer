import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSession } from '@/lib/auth';

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture?: string;
}

export async function GET(request: NextRequest) {
  const origin = (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).replace(/\/+$/, '');

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        `${origin}/login?error=google_auth_failed`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${origin}/login?error=no_code`
      );
    }

    // Обмен кода на токен
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${origin}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const tokenData: GoogleTokenResponse = await tokenResponse.json();

    // Получение информации о пользователе
    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      }
    );

    if (!userInfoResponse.ok) {
      throw new Error('Failed to fetch user info');
    }

    const googleUser: GoogleUserInfo = await userInfoResponse.json();

    // Поиск или создание пользователя
    let user = await prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    if (!user) {
      // Создаем нового пользователя с временным телефоном
      const tempPhone = `+996${Date.now().toString().slice(-9)}`;
      
      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          phone: tempPhone,
          passwordHash: '', // Пустой хеш для Google-пользователей
          firstName: googleUser.given_name || 'User',
          lastName: googleUser.family_name || '',
          city: 'Бишкек', // Город по умолчанию
          avatarUrl: googleUser.picture,
          role: 'volunteer', // По умолчанию волонтер
          status: 'active',
        },
      });

      // Создаем профиль волонтера
      await prisma.volunteerProfile.create({
        data: {
          userId: user.id,
        },
      });
    }

    // Создание сессии
    await createSession({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return NextResponse.redirect(`${origin}/dashboard`);
  } catch (error) {
    console.error('Google callback error:', error);
    return NextResponse.redirect(
      `${origin}/login?error=auth_failed`
    );
  }
}
