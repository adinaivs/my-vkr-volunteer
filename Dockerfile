# ================================================================
# Stage 1: Install all dependencies + generate Prisma client
# ================================================================
FROM node:20-slim AS deps
WORKDIR /app

# OpenSSL нужен Prisma для подключения к PostgreSQL
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Устанавливаем все зависимости (включая devDependencies для сборки)
RUN npm ci

# Генерируем Prisma Client (не требует DATABASE_URL — только читает schema.prisma)
RUN npx prisma generate

# ================================================================
# Stage 2: Сборка Next.js приложения
# ================================================================
FROM node:20-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Собираем Next.js (output: standalone — минимальный production-образ)
# DATABASE_URL и другие env не нужны при сборке — API маршруты компилируются, но не выполняются
RUN npm run build

# ================================================================
# Stage 3: Production runner (минимальный образ)
# ================================================================
FROM node:20-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Создаём непривилегированного пользователя для безопасности
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nextjs

# Standalone-сборка: server.js + минимальные node_modules (включает Prisma runtime)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Статические ассеты (CSS/JS бандлы, шрифты)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Публичные файлы (favicon, картинки и т.д.)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma schema — нужен для prisma migrate deploy при старте
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Prisma CLI (не входит в standalone minimal deps, нужен только для миграций)
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000

# При старте контейнера:
# 1. Применяем pending-миграции к внешней БД (DATABASE_URL берётся из env Timeweb)
# 2. Запускаем Next.js production-сервер
CMD ["sh", "-c", "node ./node_modules/prisma/build/index.js migrate deploy && node server.js"]
