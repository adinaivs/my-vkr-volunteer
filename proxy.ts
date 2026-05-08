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
const protectedPaths = ['/dashboard', '/volunteer', '/organizer'];

// Пути админа
const adminPaths = ['/admin/dashboard', '/admin/users', '/admin/projects', '/admin/verifications', '/admin/reports', '/admin/settings'];

export async function proxy(request: NextRequest) {
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
  let userRole: string | null = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      isAuthenticated = true;
      userRole = payload.role as string;
    } catch (error) {
      // Токен невалидный, удаляем его
      isAuthenticated = false;
    }
  }

  // Проверка доступа к админ-панели
  const isAdminPath = adminPaths.some(path => pathname.startsWith(path));
  const isAdminLoginPath = pathname === '/admin/login';

  if (isAdminPath) {
    // Требуется авторизация как админ
    if (!isAuthenticated || userRole !== 'admin') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    return NextResponse.next();
  }

  if (isAdminLoginPath) {
    // Если админ уже авторизован, редирект на дашборд
    if (isAuthenticated && userRole === 'admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Если пользователь авторизован
  if (isAuthenticated) {
    // Админ не может заходить на обычные страницы
    if (userRole === 'admin') {
      const isGuestOnlyPath = guestOnlyPaths.some(path => {
        if (path === '/') {
          return pathname === '/';
        }
        return pathname.startsWith(path);
      });

      const isUserProtectedPath = protectedPaths.some(path => pathname.startsWith(path));

      if (isGuestOnlyPath || isUserProtectedPath) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
    }

    // Обычные пользователи не могут заходить на страницы для гостей
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
