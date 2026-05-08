import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Получить список всех навыков с переводами
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') || 'ru'; // По умолчанию русский

    const skills = await prisma.skill.findMany({
      include: {
        translations: {
          where: {
            locale: locale as 'ru' | 'kg'
          }
        }
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Преобразуем данные для удобства использования
    const skillsWithNames = skills.map(skill => ({
      id: skill.id,
      name: skill.translations[0]?.name || skill.name, // Fallback на оригинальное имя если нет перевода
    }));

    return NextResponse.json({
      skills: skillsWithNames,
      count: skillsWithNames.length,
    });
  } catch (error) {
    console.error('Error fetching skills:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении списка навыков' },
      { status: 500 }
    );
  }
}
