import { NextRequest, NextResponse } from 'next/server';
import { openai, AI_CONFIG, SYSTEM_PROMPT } from '@/lib/openai';
import { prisma } from '@/lib/prisma';

// Умный чат с доступом к данным платформы
export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory = [], userId } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Сообщение обязательно' },
        { status: 400 }
      );
    }

    // Определяем нужен ли контекст из БД
    const needsContext = detectContextNeed(message);
    
    let contextInfo = '';

    // Получаем релевантные данные из БД
    if (needsContext.projects) {
      const projects = await prisma.project.findMany({
        where: { status: 'ACTIVE' },
        take: 5,
        select: {
          title: true,
          description: true,
          category: true,
          location: true,
        },
      });
      contextInfo += `\n\nАКТИВНЫЕ ПРОЕКТЫ:\n${projects.map(p => 
        `- ${p.title} (${p.category}, ${p.location})`
      ).join('\n')}`;
    }

    if (needsContext.categories) {
      const categories = await prisma.category.findMany({
        select: { name: true, description: true },
      });
      contextInfo += `\n\nКАТЕГОРИИ:\n${categories.map(c => 
        `- ${c.name}: ${c.description}`
      ).join('\n')}`;
    }

    if (needsContext.userStats && userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          _count: {
            select: {
              applications: true,
              taskAssignments: true,
            },
          },
        },
      });

      if (user) {
        contextInfo += `\n\nСТАТИСТИКА ПОЛЬЗОВАТЕЛЯ:\n- Заявок подано: ${user._count.applications}\n- Задач выполнено: ${user._count.taskAssignments}`;
      }
    }

    // Добавляем контекст к системному промпту
    const enhancedPrompt = SYSTEM_PROMPT + contextInfo;

    const limitedHistory = conversationHistory.slice(-5);

    const messages = [
      { role: 'system', content: enhancedPrompt },
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
      usage: completion.usage,
      contextUsed: needsContext,
    });
  } catch (error: any) {
    console.error('AI Chat with Context Error:', error);
    
    return NextResponse.json(
      { error: 'Ошибка AI помощника' },
      { status: 500 }
    );
  }
}

// Определяем какой контекст нужен на основе вопроса
function detectContextNeed(message: string): {
  projects: boolean;
  categories: boolean;
  userStats: boolean;
} {
  const lowerMessage = message.toLowerCase();

  return {
    projects: 
      lowerMessage.includes('проект') ||
      lowerMessage.includes('какие есть') ||
      lowerMessage.includes('найти') ||
      lowerMessage.includes('доступн'),
    
    categories: 
      lowerMessage.includes('категори') ||
      lowerMessage.includes('тип') ||
      lowerMessage.includes('направлени'),
    
    userStats: 
      lowerMessage.includes('мо') ||
      lowerMessage.includes('статистик') ||
      lowerMessage.includes('сколько'),
  };
}
