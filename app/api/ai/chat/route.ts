import { NextRequest, NextResponse } from 'next/server';
import { openai, AI_CONFIG, SYSTEM_PROMPT } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory = [] } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Сообщение обязательно' },
        { status: 400 }
      );
    }

    // Ограничиваем историю последними 5 сообщениями для экономии токенов
    const limitedHistory = conversationHistory.slice(-5);

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...limitedHistory,
      { role: 'user', content: message },
    ];

    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      messages: messages as any,
      temperature: AI_CONFIG.temperature,
      max_tokens: AI_CONFIG.max_tokens,
    });

    const reply = completion.choices[0]?.message?.content || 'Извините, не могу ответить';

    return NextResponse.json({
      reply,
      usage: completion.usage, // Для отслеживания затрат
    });
  } catch (error: any) {
    console.error('AI Chat Error:', error);
    
    if (error?.status === 401) {
      return NextResponse.json(
        { error: 'Неверный API ключ OpenAI' },
        { status: 401 }
      );
    }

    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'Превышен лимит запросов. Попробуйте позже' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Ошибка AI помощника' },
      { status: 500 }
    );
  }
}
