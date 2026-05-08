import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Получить список категорий с переводами
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') || 'ru'; // По умолчанию русский

    const categories = await prisma.category.findMany({
      include: {
        translations: {
          where: {
            locale: locale as 'ru' | 'kg'
          }
        }
      },
      orderBy: {
        slug: 'asc',
      },
    });

    // Преобразуем данные для удобства использования
    const categoriesWithNames = categories.map(category => ({
      id: category.id,
      slug: category.slug,
      icon: category.icon,
      name: category.translations[0]?.name || category.slug, // Fallback на slug если нет перевода
    }));

    return NextResponse.json({ categories: categoriesWithNames });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении списка категорий' },
      { status: 500 }
    );
  }
}
