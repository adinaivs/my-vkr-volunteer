import { NextRequest, NextResponse } from 'next/server';
import { openai, AI_CONFIG } from '@/lib/openai';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const SYSTEM_PROMPT = `Ты ИИ-ассистент волонтёрской платформы VolunteerHub (Кыргызстан).
Помогаешь волонтёрам и организаторам разобраться с платформой.

ВАЖНЫЕ ПРАВИЛА:
- Отвечай кратко и по делу на русском языке
- Когда перечисляешь проекты — НЕ делай markdown-таблицу, просто напиши вводную фразу (1-2 предложения). Данные таблицы будут отображены системой автоматически.
- Когда описываешь конкретный проект — включи описание из БД и добавь 1-2 предложения от себя
- Будь дружелюбным, используй эмодзи умеренно`;

// Определяем намерение пользователя
function detectIntent(message: string): {
  listProjects: boolean;
  projectQuery: string | null;  // название или номер проекта
  categories: boolean;
  userStats: boolean;
} {
  const lower = message.toLowerCase();

  // Ищем запрос по конкретному проекту: по номеру или названию
  const byNumber = message.match(/проект\s*(?:№|#|номер)?\s*(\d+)/i);
  const byName = message.match(/(?:расскаж[иа]|опиш[иа]|что такое|подробн|о проекте)\s+[«"]?([а-яёa-z0-9\s]+)[»"]?/i);

  return {
    listProjects:
      lower.includes('проект') &&
      (lower.includes('какие') || lower.includes('доступн') ||
       lower.includes('список') || lower.includes('найди') ||
       lower.includes('покажи') || lower.includes('есть')),
    projectQuery: byNumber?.[1] ?? byName?.[1]?.trim() ?? null,
    categories:
      lower.includes('категори') || lower.includes('направлени'),
    userStats:
      lower.includes('мои') || lower.includes('статистик'),
  };
}

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory = [] } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Сообщение обязательно' }, { status: 400 });
    }

    const session = await getSession();
    const userId = session?.userId as string | undefined;

    const intent = detectIntent(message);
    let contextText = '';
    let projectsData: any[] | null = null;
    let projectDetail: any | null = null;

    // ── Список проектов ──────────────────────────────────────────
    if (intent.listProjects) {
      const projects = await prisma.project.findMany({
        where: { status: { in: ['recruiting', 'upcoming'] } },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          location: true,
          startDate: true,
          endDate: true,
          maxVolunteers: true,
          currentVolunteers: true,
          status: true,
          category: {
            include: { translations: { where: { locale: 'ru' } } },
          },
        },
      });

      projectsData = projects.map((p, i) => ({
        num: i + 1,
        id: p.id,
        title: p.title,
        category:
          p.category.translations[0]?.name ?? p.category.slug,
        location: p.location,
        dates: `${new Date(p.startDate).toLocaleDateString('ru-RU')} – ${new Date(p.endDate).toLocaleDateString('ru-RU')}`,
        volunteers: `${p.currentVolunteers}/${p.maxVolunteers}`,
        status: p.status === 'recruiting' ? 'Набор волонтёров' : 'Скоро начнётся',
      }));

      contextText += `\nДоступных проектов: ${projects.length}. Список будет показан пользователю в виде таблицы — ты только напиши вводную фразу.`;
    }

    // ── Конкретный проект ────────────────────────────────────────
    if (intent.projectQuery) {
      const q = intent.projectQuery;
      const isNum = /^\d+$/.test(q);

      let project = null;

      if (isNum) {
        // По порядковому номеру (берём все проекты и выбираем нужный)
        const all = await prisma.project.findMany({
          where: { status: { in: ['recruiting', 'upcoming', 'active'] } },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, title: true, description: true, location: true,
            startDate: true, endDate: true, maxVolunteers: true,
            currentVolunteers: true, status: true,
            category: { include: { translations: { where: { locale: 'ru' } } } },
          },
        });
        project = all[parseInt(q) - 1] ?? null;
      } else {
        // По названию (нечёткий поиск)
        project = await prisma.project.findFirst({
          where: { title: { contains: q, mode: 'insensitive' } },
          select: {
            id: true, title: true, description: true, location: true,
            startDate: true, endDate: true, maxVolunteers: true,
            currentVolunteers: true, status: true,
            category: { include: { translations: { where: { locale: 'ru' } } } },
          },
        });
      }

      if (project) {
        projectDetail = {
          title: project.title,
          category: (project.category as any).translations?.[0]?.name ?? '',
          location: project.location,
          dates: `${new Date(project.startDate).toLocaleDateString('ru-RU')} – ${new Date(project.endDate).toLocaleDateString('ru-RU')}`,
          volunteers: `${project.currentVolunteers}/${project.maxVolunteers}`,
          status: project.status,
          description: project.description,
        };
        contextText += `\n\nПРОЕКТ ДЛЯ ОПИСАНИЯ:\nНазвание: ${project.title}\nОписание: ${project.description}\nМесто: ${project.location}\nДаты: ${projectDetail.dates}\nВолонтёры: ${projectDetail.volunteers}\n\nВключи это описание в ответ и добавь 1-2 предложения от себя.`;
      } else {
        contextText += `\nПроект "${q}" не найден. Сообщи об этом пользователю.`;
      }
    }

    // ── Категории ────────────────────────────────────────────────
    if (intent.categories) {
      const cats = await prisma.category.findMany({
        include: { translations: { where: { locale: 'ru' } } },
      });
      contextText += `\n\nКАТЕГОРИИ: ${cats.map(c => c.translations[0]?.name ?? c.slug).join(', ')}`;
    }

    // ── Статистика пользователя ──────────────────────────────────
    if (intent.userStats && userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          _count: { select: { applications: true, taskAssignments: true } },
        },
      });
      if (user) {
        contextText += `\n\nСТАТИСТИКА: заявок ${user._count.applications}, задач ${user._count.taskAssignments}`;
      }
    }

    // ── Запрос к ИИ ──────────────────────────────────────────────
    const systemContent = SYSTEM_PROMPT + (contextText ? `\n\nКОНТЕКСТ:${contextText}` : '');

    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      messages: [
        { role: 'system', content: systemContent },
        ...conversationHistory.slice(-6) as any,
        { role: 'user', content: message },
      ],
      temperature: AI_CONFIG.temperature,
      max_tokens: AI_CONFIG.max_tokens,
    });

    const reply = completion.choices[0]?.message?.content ?? 'Извините, не могу ответить';

    return NextResponse.json({ reply, projectsData, projectDetail });
  } catch (error) {
    console.error('AI Chat error:', error);
    return NextResponse.json({ error: 'Ошибка ИИ-ассистента' }, { status: 500 });
  }
}
