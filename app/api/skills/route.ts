import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Получить список всех навыков
export async function GET(request: NextRequest) {
  try {
    const skills = await prisma.skill.findMany({
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
      },
    });

    return NextResponse.json({
      skills,
      count: skills.length,
    });
  } catch (error) {
    console.error('Error fetching skills:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении списка навыков' },
      { status: 500 }
    );
  }
}
