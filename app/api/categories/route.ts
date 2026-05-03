import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Получить список категорий
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: {
        slug: 'asc',
      },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении списка категорий' },
      { status: 500 }
    );
  }
}
