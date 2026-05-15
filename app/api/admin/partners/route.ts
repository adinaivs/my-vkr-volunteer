import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }
    const partners = await prisma.partner.findMany({
      orderBy: { name: 'asc' },
      include: { rewards: { select: { id: true } } },
    });
    return NextResponse.json({ partners });
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
    const { name, logoUrl, contactInfo, isActive } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Название обязательно' }, { status: 400 });
    }
    const partner = await prisma.partner.create({
      data: {
        name: name.trim(),
        logoUrl: logoUrl?.trim() || null,
        contactInfo: contactInfo?.trim() || null,
        isActive: isActive ?? true,
      },
    });
    return NextResponse.json({ partner }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
