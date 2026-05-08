import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { icon, conditionType, conditionValue, isActive, nameRu, descRu, nameKg, descKg } = body;

    if (!nameRu?.trim() || !descRu?.trim() || !icon?.trim() || !conditionType) {
      return NextResponse.json({ error: 'Название, описание, иконка и условие обязательны' }, { status: 400 });
    }

    const achievement = await prisma.$transaction(async (tx) => {
      await tx.achievement.update({
        where: { id },
        data: {
          name: nameRu.trim(),
          description: descRu.trim(),
          icon: icon.trim(),
          conditionType,
          conditionValue: parseInt(conditionValue) || 1,
          isActive: isActive !== false,
        },
      });

      await tx.achievementTranslation.upsert({
        where: { achievementId_locale: { achievementId: id, locale: 'ru' } },
        update: { name: nameRu.trim(), description: descRu.trim() },
        create: { achievementId: id, locale: 'ru', name: nameRu.trim(), description: descRu.trim() },
      });

      if (nameKg?.trim()) {
        await tx.achievementTranslation.upsert({
          where: { achievementId_locale: { achievementId: id, locale: 'kg' } },
          update: { name: nameKg.trim(), description: descKg?.trim() || nameKg.trim() },
          create: { achievementId: id, locale: 'kg', name: nameKg.trim(), description: descKg?.trim() || nameKg.trim() },
        });
      }

      return tx.achievement.findUnique({ where: { id }, include: { translations: true } });
    });

    return NextResponse.json({ achievement });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const { id } = await params;
    await prisma.achievement.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
