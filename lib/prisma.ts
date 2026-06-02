import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function buildDatabaseUrl(): string {
  const base = process.env.DATABASE_URL ?? '';
  if (!base) return base;

  // Добавляем параметры совместимости с Neon (auto-pause)
  const sep = base.includes('?') ? '&' : '?';
  return (
    base +
    sep +
    'connect_timeout=30' +
    '&pool_timeout=30' +
    '&connection_limit=5' +
    '&socket_timeout=30'
  );
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasourceUrl: buildDatabaseUrl(),
  });
}

// Синглтон: в dev переиспользуем между hot-reloads
export const prisma: PrismaClient =
  globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

// ─────────────────────────────────────────────────────────
// Утилита для повтора DB-операций при обрыве соединения
// (E57P01 = Neon admin_shutdown, P1017 = connection closed)
// ─────────────────────────────────────────────────────────
function isNeonConnectionError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message + (String((err as any).code ?? ''));
  return (
    msg.includes('E57P01') ||
    msg.includes('terminating connection') ||
    msg.includes('P1017') ||
    msg.includes('P1001') ||
    msg.includes('Connection pool timed out') ||
    msg.includes('connect ECONNREFUSED') ||
    msg.includes('ECONNRESET')
  );
}

export async function withDbRetry<T>(
  operation: () => Promise<T>,
  retries = 3
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;

      if (!isNeonConnectionError(err) || attempt === retries) {
        throw err;
      }

      const delay = attempt * 800; // 800 мс, 1600 мс, ...
      console.warn(
        `[prisma] connection error on attempt ${attempt}/${retries}, retry in ${delay}ms`,
        (err as Error).message
      );
      await new Promise(r => setTimeout(r, delay));

      // Принудительно переоткрываем соединение
      try { await prisma.$disconnect(); } catch { /* ignore */ }
      try { await prisma.$connect();    } catch { /* ignore */ }
    }
  }

  throw lastError;
}
