import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { prisma } from '@/lib/prisma';

// Умный поиск проектов на естественном языке
export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: 'Запрос обязателен' },
        { status: 400 }
      );
    }

    // Используем AI для интерпретации запроса
    const interpretation = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Ты - эксперт по анализу поисковых запросов. 
          Извлеки из запроса пользователя ключевые слова для поиска проектов.
          Ответь ТОЛЬКО в формате JSON: {"keywords": ["слово1", "слово2"], "category": "категория или null"}`,
        },
        {
          role: 'user',
          content: `Запрос: "${query}"`,
        },
      ],
      temperature: 0.3,
      max_tokens: 100,
    });

    const content = interpretation.choices[0]?.message?.content || '{}';
    let parsed = { keywords: [], category: null };
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e);
    }

    // Ищем проекты в БД
    const projects = await prisma.project.findMany({
      where: {
        status: 'active',
        OR: [
          {
            title: {
              contains: query,
              mode: 'insensitive' as const,
            },
          },
          {
            description: {
              contains: query,
              mode: 'insensitive' as const,
            },
          },
          ...(parsed.keywords || []).map((keyword: string) => ({
            OR: [
              { title: { contains: keyword, mode: 'insensitive' as const } },
              { description: { contains: keyword, mode: 'insensitive' as const } },
            ],
          })),
        ],
      },
      take: 10,
      include: {
        organizer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            tasks: true,
            applications: true,
          },
        },
      },
    });

    // Генерируем краткое описание результатов
    const summary = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Ты - помощник волонтерской платформы. Кратко опиши найденные проекты (2-3 предложения).',
        },
        {
          role: 'user',
          content: `Запрос: "${query}"\nНайдено проектов: ${projects.length}\nПроекты: ${projects.map(p => p.title).join(', ')}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    return NextResponse.json({
      projects,
      summary: summary.choices[0]?.message?.content || '',
      interpretation: parsed,
      usage: {
        interpretation: interpretation.usage,
        summary: summary.usage,
      },
    });
  } catch (error: any) {
    console.error('AI Search Projects Error:', error);
    return NextResponse.json(
      { error: 'Ошибка поиска проектов' },
      { status: 500 }
    );
  }
}
