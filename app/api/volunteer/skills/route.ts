import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/volunteer/skills - Добавить навык
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'volunteer') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const body = await request.json();
    const { skillId } = body;

    if (!skillId) {
      return NextResponse.json({ error: 'Укажите навык' }, { status: 400 });
    }

    const skill = await prisma.skill.findUnique({ where: { id: skillId } });
    if (!skill) {
      return NextResponse.json({ error: 'Навык не найден' }, { status: 404 });
    }

    await prisma.userSkill.upsert({
      where: { userId_skillId: { userId: session.userId, skillId } },
      update: {},
      create: { userId: session.userId, skillId },
    });

    return NextResponse.json({ message: 'Навык добавлен' });
  } catch (error) {
    console.error('Ошибка при добавлении навыка:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// DELETE /api/volunteer/skills?skillId=... - Удалить навык
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'volunteer') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const skillId = searchParams.get('skillId');

    if (!skillId) {
      return NextResponse.json({ error: 'Укажите навык' }, { status: 400 });
    }

    await prisma.userSkill.deleteMany({
      where: { userId: session.userId, skillId },
    });

    return NextResponse.json({ message: 'Навык удалён' });
  } catch (error) {
    console.error('Ошибка при удалении навыка:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
