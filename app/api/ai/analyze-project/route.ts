import { NextRequest, NextResponse } from 'next/server';
import { openai, AI_CONFIG } from '@/lib/openai';

// Анализ описания проекта и генерация улучшений
export async function POST(request: NextRequest) {
  try {
    const { projectTitle, projectDescription } = await request.json();

    if (!projectDescription) {
      return NextResponse.json(
        { error: 'Описание проекта обязательно' },
        { status: 400 }
      );
    }

    const prompt = `Проанализируй описание волонтерского проекта и дай краткие рекомендации по улучшению:

Название: ${projectTitle || 'Не указано'}
Описание: ${projectDescription}

Дай 3 конкретных совета как улучшить описание, чтобы привлечь больше волонтеров.`;

    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: 'Ты - эксперт по созданию волонтерских проектов. Давай конкретные и полезные советы.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 300,
    });

    const analysis = completion.choices[0]?.message?.content || '';

    return NextResponse.json({
      analysis,
      usage: completion.usage,
    });
  } catch (error: any) {
    console.error('AI Project Analysis Error:', error);
    return NextResponse.json(
      { error: 'Ошибка анализа проекта' },
      { status: 500 }
    );
  }
}
