import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, getAuthenticatedUser } from '@/lib/auth';
import { getCategoryInclude, formatCategoryWithTranslation } from '@/lib/category-helpers';
import { uploadToS3, validateFile } from '@/lib/s3';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthenticatedUser();
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { id } = await params;
    
    // Проверяем, что проект принадлежит пользователю
    const existingProject = await prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });
    }

    if (existingProject.organizerId !== session.userId) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    // Можно редактировать только черновики и отклоненные проекты
    if (existingProject.status !== 'draft' && existingProject.status !== 'rejected') {
      return NextResponse.json(
        { error: 'Можно редактировать только черновики и отклоненные проекты' },
        { status: 400 }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    let body: any;
    let imageFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      body = {
        title: formData.get('title'),
        description: formData.get('description'),
        categoryId: formData.get('categoryId'),
        startDate: formData.get('startDate'),
        endDate: formData.get('endDate'),
        location: formData.get('location'),
        latitude: formData.get('latitude'),
        longitude: formData.get('longitude'),
        maxVolunteers: formData.get('maxVolunteers'),
      };
      imageFile = formData.get('image') as File | null;
    } else {
      body = await request.json();
    }

    // Загружаем новое изображение если есть
    let imageUrl = existingProject.imageUrl;
    if (imageFile && imageFile.size > 0) {
      const validation = validateFile(imageFile, 10, ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
      imageUrl = await uploadToS3(imageFile, 'project-images');
    }

    // Обновляем проект
    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        categoryId: body.categoryId,
        imageUrl,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        location: body.location,
        latitude: body.latitude ? parseFloat(body.latitude) : null,
        longitude: body.longitude ? parseFloat(body.longitude) : null,
        maxVolunteers: parseInt(body.maxVolunteers),
        // Сбрасываем причину отклонения при редактировании
        rejectionReason: null,
      },
    });

    return NextResponse.json({
      message: 'Проект обновлен',
      project: updatedProject,
    });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении проекта' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const locale = (searchParams.get('locale') || 'ru') as 'ru' | 'kg';

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        ...getCategoryInclude(locale),
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatarUrl: true,
            organizerProfile: {
              select: {
                organizationName: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });
    }

    // Преобразуем Decimal в number для координат и форматируем категорию
    const projectData = {
      ...project,
      latitude: project.latitude ? parseFloat(project.latitude.toString()) : null,
      longitude: project.longitude ? parseFloat(project.longitude.toString()) : null,
      category: formatCategoryWithTranslation(project.category)
    };

    return NextResponse.json({ project: projectData });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении проекта' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthenticatedUser();
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { id } = await params;
    
    // Проверяем, что проект существует
    const existingProject = await prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });
    }

    // Проверяем, что проект принадлежит пользователю
    if (existingProject.organizerId !== session.userId) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    // Организатор может удалять только черновики и проекты на модерации
    if (existingProject.status !== 'draft' && existingProject.status !== 'moderation') {
      return NextResponse.json(
        { error: 'Можно удалять только черновики и проекты на модерации' },
        { status: 400 }
      );
    }

    // Удаляем проект (каскадное удаление задач и заявок настроено в схеме)
    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Проект успешно удален',
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Ошибка при удалении проекта' },
      { status: 500 }
    );
  }
}
