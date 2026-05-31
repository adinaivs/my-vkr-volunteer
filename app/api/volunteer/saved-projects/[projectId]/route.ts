import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/volunteer/saved-projects/[projectId]
// Проверяет, сохранён ли проект текущим волонтёром
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ saved: false });

    const { projectId } = await params;

    const record = await prisma.savedProject.findUnique({
      where: { userId_projectId: { userId: session.userId, projectId } },
    });

    return NextResponse.json({ saved: !!record });
  } catch {
    return NextResponse.json({ saved: false });
  }
}

// POST /api/volunteer/saved-projects/[projectId]
// Сохраняет проект в закладки
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || user.role !== 'volunteer') {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const { projectId } = await params;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });

    await prisma.savedProject.upsert({
      where: { userId_projectId: { userId: session.userId, projectId } },
      create: { userId: session.userId, projectId },
      update: {},
    });

    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error('Ошибка при сохранении проекта:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// DELETE /api/volunteer/saved-projects/[projectId]
// Удаляет проект из закладок
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const { projectId } = await params;

    await prisma.savedProject.deleteMany({
      where: { userId: session.userId, projectId },
    });

    return NextResponse.json({ saved: false });
  } catch (error) {
    console.error('Ошибка при удалении сохранённого проекта:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
