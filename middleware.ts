import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

// Пути, доступные только для неавторизованных пользователей
const guestOnlyPaths = ['/', '/login', '/register', '/forgot-password'];

// Пути, доступные всем (включая API)
const publicPaths = ['/api/auth'];

// Защищенные пути (требуют авторизации)
const protectedPaths = ['/dashboard'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Пропускаем API пути
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Пропускаем статические файлы
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Проверяем сессию
  const token = request.cookies.get('session')?.value;
  let isAuthenticated = false;

  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET);
      isAuthenticated = true;
    } catch (error) {
      // Токен невалидный, удаляем его
      isAuthenticated = false;
    }
  }

  // Если пользователь авторизован
  if (isAuthenticated) {
    // Проверяем, пытается ли он зайти на страницы для гостей
    const isGuestOnlyPath = guestOnlyPaths.some(path => {
      if (path === '/') {
        return pathname === '/';
      }
      return pathname.startsWith(path);
    });

    if (isGuestOnlyPath) {
      // Редирект на дашборд
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Авторизованный пользователь может продолжить
    return NextResponse.next();
  }

  // Если пользователь НЕ авторизован
  // Проверяем, пытается ли он зайти на защищенные страницы
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));

  if (isProtectedPath) {
    // Редирект на логин
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('session');
    return response;
  }

  // Неавторизованный пользователь может продолжить на публичные страницы
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
