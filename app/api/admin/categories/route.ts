import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const categories = await prisma.category.findMany({
      include: { translations: true },
      orderBy: { slug: 'asc' },
    });

    return NextResponse.json({ categories });
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
    const { slug, icon, nameRu, nameKg } = body;

    if (!slug?.trim() || !icon?.trim() || !nameRu?.trim()) {
      return NextResponse.json({ error: 'slug, icon и название (рус) обязательны' }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: {
        slug: slug.trim(),
        icon: icon.trim(),
        translations: {
          create: [
            { locale: 'ru', name: nameRu.trim() },
            ...(nameKg?.trim() ? [{ locale: 'kg' as const, name: nameKg.trim() }] : []),
          ],
        },
      },
      include: { translations: true },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Категория с таким slug уже существует' }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
