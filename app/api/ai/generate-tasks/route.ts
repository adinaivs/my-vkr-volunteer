import { NextRequest, NextResponse } from 'next/server';
import { openai, AI_CONFIG } from '@/lib/openai';

// Генерация задач для проекта на основе описания
export async function POST(request: NextRequest) {
  try {
    const { projectDescription, numberOfTasks = 3 } = await request.json();

    if (!projectDescription) {
      return NextResponse.json(
        { error: 'Описание проекта обязательно' },
        { status: 400 }
      );
    }

    const prompt = `На основе описания волонтерского проекта предложи ${numberOfTasks} конкретных задачи для волонтеров:

${projectDescription}

Формат ответа (JSON):
[
  {
    "title": "Название задачи",
    "description": "Краткое описание",
    "estimatedHours": число_часов
  }
]`;

    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: 'Ты помогаешь создавать задачи для волонтерских проектов. Отвечай только в формате JSON.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 400,
    });

    const content = completion.choices[0]?.message?.content || '[]';
    
    // Пытаемся распарсить JSON
    let tasks = [];
    try {
      // Извлекаем JSON из ответа (может быть обернут в ```json```)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        tasks = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', e);
    }

    return NextResponse.json({
      tasks,
      rawResponse: content,
      usage: completion.usage,
    });
  } catch (error: any) {
    console.error('AI Generate Tasks Error:', error);
    return NextResponse.json(
      { error: 'Ошибка генерации задач' },
      { status: 500 }
    );
  }
}
