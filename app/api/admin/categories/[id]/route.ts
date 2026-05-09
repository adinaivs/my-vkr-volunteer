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
    const { slug, icon, nameRu, nameKg } = body;

    if (!slug?.trim() || !icon?.trim() || !nameRu?.trim()) {
      return NextResponse.json({ error: 'slug, icon и название (рус) обязательны' }, { status: 400 });
    }

    const category = await prisma.$transaction(async (tx) => {
      await tx.category.update({
        where: { id },
        data: { slug: slug.trim(), icon: icon.trim() },
      });

      await tx.categoryTranslation.upsert({
        where: { categoryId_locale: { categoryId: id, locale: 'ru' } },
        update: { name: nameRu.trim() },
        create: { categoryId: id, locale: 'ru', name: nameRu.trim() },
      });

      if (nameKg?.trim()) {
        await tx.categoryTranslation.upsert({
          where: { categoryId_locale: { categoryId: id, locale: 'kg' } },
          update: { name: nameKg.trim() },
          create: { categoryId: id, locale: 'kg', name: nameKg.trim() },
        });
      }

      return tx.category.findUnique({ where: { id }, include: { translations: true } });
    });

    return NextResponse.json({ category });
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

    const projectsCount = await prisma.project.count({ where: { categoryId: id } });
    if (projectsCount > 0) {
      return NextResponse.json(
        { error: `Нельзя удалить: категория используется в ${projectsCount} проектах` },
        { status: 409 }
      );
    }

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
