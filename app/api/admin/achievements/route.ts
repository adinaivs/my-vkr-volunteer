import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const achievements = await prisma.achievement.findMany({
      include: { translations: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ achievements });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const body = await request.json();
    const { icon, conditionType, conditionValue, isActive, nameRu, descRu, nameKg, descKg } = body;

    if (!nameRu?.trim() || !descRu?.trim() || !icon?.trim() || !conditionType) {
      return NextResponse.json({ error: 'Название, описание, иконка и условие обязательны' }, { status: 400 });
    }

    const achievement = await prisma.achievement.create({
      data: {
        name: nameRu.trim(),
        description: descRu.trim(),
        icon: icon.trim(),
        conditionType,
        conditionValue: parseInt(conditionValue) || 1,
        isActive: isActive !== false,
        translations: {
          create: [
            { locale: 'ru', name: nameRu.trim(), description: descRu.trim() },
            ...(nameKg?.trim()
              ? [{ locale: 'kg' as const, name: nameKg.trim(), description: descKg?.trim() || nameKg.trim() }]
              : []),
          ],
        },
      },
      include: { translations: true },
    });

    return NextResponse.json({ achievement }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
