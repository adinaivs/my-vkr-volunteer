import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const skills = await prisma.skill.findMany({
      include: { translations: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ skills });
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
    const { nameRu, nameKg } = body;

    if (!nameRu?.trim()) {
      return NextResponse.json({ error: 'Название (рус) обязательно' }, { status: 400 });
    }

    const skill = await prisma.skill.create({
      data: {
        name: nameRu.trim(),
        translations: {
          create: [
            { locale: 'ru', name: nameRu.trim() },
            ...(nameKg?.trim() ? [{ locale: 'kg' as const, name: nameKg.trim() }] : []),
          ],
        },
      },
      include: { translations: true },
    });

    return NextResponse.json({ skill }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Навык с таким названием уже существует' }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
