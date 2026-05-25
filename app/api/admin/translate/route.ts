import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { openai } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const { text, field } = await request.json();
    if (!text?.trim()) {
      return NextResponse.json({ error: 'Текст обязателен' }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Ты профессиональный переводчик с русского на кыргызский язык. Переводи точно, кратко, без пояснений. Отвечай только самим переводом — без кавычек, без скобок, без пояснений.',
        },
        {
          role: 'user',
          content: `Переведи на кыргызский язык: ${text}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    const raw = completion.choices[0]?.message?.content?.trim() || '';
    // Убираем обрамляющие кавычки если модель их добавила
    const translation = raw.replace(/^["«»"']+|["«»"']+$/g, '').trim();

    return NextResponse.json({ translation });
  } catch (error: any) {
    console.error('Translate error:', error);
    if (error?.status === 401) return NextResponse.json({ error: 'Неверный API ключ OpenAI' }, { status: 401 });
    if (error?.status === 429) return NextResponse.json({ error: 'Превышен лимит запросов' }, { status: 429 });
    return NextResponse.json({ error: 'Ошибка перевода' }, { status: 500 });
  }
}
