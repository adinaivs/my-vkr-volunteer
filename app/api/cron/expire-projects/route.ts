import { NextRequest, NextResponse } from 'next/server';
import { expireProjects } from '@/lib/expire-projects';

// Запуск проверки сроков по расписанию (внешний cron / планировщик Timeweb).
// Защищён секретом CRON_SECRET: передаётся заголовком
//   Authorization: Bearer <CRON_SECRET>
// либо query-параметром ?secret=<CRON_SECRET>.
async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: 'CRON_SECRET не настроен на сервере' },
      { status: 500 }
    );
  }

  const auth = request.headers.get('authorization');
  const headerSecret = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  const querySecret = new URL(request.url).searchParams.get('secret');

  if (headerSecret !== secret && querySecret !== secret) {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 401 });
  }

  try {
    const result = await expireProjects();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('Cron expire-projects failed:', error);
    return NextResponse.json({ error: 'Ошибка выполнения' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
