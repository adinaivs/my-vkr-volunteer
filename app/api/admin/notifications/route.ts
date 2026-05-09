import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

async function checkAdmin() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  return user?.role === 'admin' ? user : null;
}

export async function GET() {
  try {
    if (!await checkAdmin()) return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });

    const [msgSetting, activeSetting] = await Promise.all([
      prisma.setting.findUnique({ where: { key: 'announcement_message' } }),
      prisma.setting.findUnique({ where: { key: 'announcement_active' } }),
    ]);

    return NextResponse.json({
      message: msgSetting?.value || '',
      active: activeSetting?.value === 'true',
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!await checkAdmin()) return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });

    const { message, active } = await request.json();

    await Promise.all([
      prisma.setting.upsert({
        where: { key: 'announcement_message' },
        update: { value: message || '' },
        create: { key: 'announcement_message', value: message || '' },
      }),
      prisma.setting.upsert({
        where: { key: 'announcement_active' },
        update: { value: active ? 'true' : 'false' },
        create: { key: 'announcement_active', value: active ? 'true' : 'false' },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
