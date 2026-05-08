import { NextRequest, NextResponse } from 'next/server';
import { openai, AI_CONFIG } from '@/lib/openai';

// Умные подсказки для проектов на основе интересов пользователя
export async function POST(request: NextRequest) {
  try {
    const { userInterests, userSkills, projectDescription } = await request.json();

    const prompt = `На основе интересов пользователя: ${userInterests?.join(', ') || 'не указаны'}
Навыки: ${userSkills?.join(', ') || 'не указаны'}

Проект: ${projectDescription}

Дай краткую рекомендацию (2-3 предложения): подходит ли этот проект пользователю и почему?`;

    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      messages: [
        { role: 'system', content: 'Ты - эксперт по подбору волонтерских проектов. Давай краткие и точные рекомендации.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 150, // Очень короткий ответ для экономии
    });

    const suggestion = completion.choices[0]?.message?.content || '';

    return NextResponse.json({
      suggestion,
      usage: completion.usage,
    });
  } catch (error: any) {
    console.error('AI Suggestions Error:', error);
    return NextResponse.json(
      { error: 'Ошибка получения рекомендаций' },
      { status: 500 }
    );
  }
}
