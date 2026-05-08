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
    const { nameRu, nameKg } = body;

    if (!nameRu?.trim()) {
      return NextResponse.json({ error: 'Название (рус) обязательно' }, { status: 400 });
    }

    const skill = await prisma.$transaction(async (tx) => {
      await tx.skill.update({ where: { id }, data: { name: nameRu.trim() } });

      await tx.skillTranslation.upsert({
        where: { skillId_locale: { skillId: id, locale: 'ru' } },
        update: { name: nameRu.trim() },
        create: { skillId: id, locale: 'ru', name: nameRu.trim() },
      });

      if (nameKg?.trim()) {
        await tx.skillTranslation.upsert({
          where: { skillId_locale: { skillId: id, locale: 'kg' } },
          update: { name: nameKg.trim() },
          create: { skillId: id, locale: 'kg', name: nameKg.trim() },
        });
      }

      return tx.skill.findUnique({ where: { id }, include: { translations: true } });
    });

    return NextResponse.json({ skill });
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

    const tasksCount = await prisma.task.count({ where: { requiredSkillId: id } });
    if (tasksCount > 0) {
      return NextResponse.json(
        { error: `Нельзя удалить: навык используется в ${tasksCount} задачах` },
        { status: 409 }
      );
    }

    await prisma.skill.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
