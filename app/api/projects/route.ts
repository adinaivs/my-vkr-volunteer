import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getCategoryInclude, formatCategoryWithTranslation } from '@/lib/category-helpers';
import { uploadToS3, validateFile } from '@/lib/s3';
import { checkAchievementsOnProjectCreated } from '@/lib/achievements';

// POST - Создать новый проект
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Проверяем, что пользователь - организатор
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        organizerProfile: true,
      },
    });

    if (!user || user.role !== 'organizer') {
      return NextResponse.json(
        { error: 'Только организаторы могут создавать проекты' },
        { status: 403 }
      );
    }

    // КРИТИЧЕСКАЯ ПРОВЕРКА: Организатор должен быть подтвержден админом
    if (!user.organizerProfile?.isApprovedByAdmin) {
      return NextResponse.json(
        {
          error: 'Ваш аккаунт еще не подтвержден администратором',
          message:
            'Для публикации проектов необходимо дождаться подтверждения вашего аккаунта администратором. Обычно это занимает 1-2 рабочих дня.',
          code: 'ORGANIZER_NOT_APPROVED',
        },
        { status: 403 }
      );
    }

    // Проверяем Content-Type для определения типа запроса
    const contentType = request.headers.get('content-type') || '';
    
    let body: any;
    let imageFile: File | null = null;
    let tasks: any[] = [];

    if (contentType.includes('multipart/form-data')) {
      // Запрос с файлом
      const formData = await request.formData();
      
      // Извлекаем данные из FormData
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
        isPaid: formData.get('isPaid') === 'true',
      };

      // Получаем файл изображения
      imageFile = formData.get('image') as File | null;
      
      // Получаем задачи, если они есть
      const tasksData = formData.get('tasks');
      if (tasksData) {
        try {
          tasks = JSON.parse(tasksData as string);
        } catch (e) {
          console.error('Error parsing tasks:', e);
          tasks = [];
        }
      }
    } else {
      // JSON запрос (без файла)
      body = await request.json();
      tasks = body.tasks || [];
    }

    const {
      title,
      description,
      categoryId,
      startDate,
      endDate,
      location,
      latitude,
      longitude,
      maxVolunteers,
      isPaid,
    } = body;

    // Валидация обязательных полей
    if (
      !title ||
      !description ||
      !categoryId ||
      !startDate ||
      !endDate ||
      !location ||
      !maxVolunteers
    ) {
      return NextResponse.json(
        { error: 'Все обязательные поля должны быть заполнены' },
        { status: 400 }
      );
    }

    // ВРЕМЕННО: Проверка оплаты отключена
    // Все проекты считаются оплаченными до реализации платежной системы
    // const needsPayment =
    //   user.organizerProfile.freePostsRemaining <= 0 && !isPaid;

    // if (needsPayment) {
    //   return NextResponse.json(
    //     {
    //       error: 'Необходима оплата',
    //       message:
    //         'У вас закончились бесплатные публикации. Для публикации этого проекта необходимо оплатить.',
    //       code: 'PAYMENT_REQUIRED',
    //     },
    //     { status: 402 }
    //   );
    // }

    // Загружаем изображение в S3, если оно есть
    let imageUrl: string | null = null;
    if (imageFile && imageFile.size > 0) {
      console.log('Загрузка изображения проекта в S3:', imageFile.name);
      
      // Валидация изображения
      const validation = validateFile(imageFile, 10, ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }

      try {
        imageUrl = await uploadToS3(imageFile, 'project-images');
        console.log('Изображение проекта загружено:', imageUrl);
      } catch (uploadError) {
        console.error('Ошибка загрузки изображения:', uploadError);
        return NextResponse.json(
          { error: 'Ошибка при загрузке изображения' },
          { status: 500 }
        );
      }
    }

    // Создаем проект
    const project = await prisma.project.create({
      data: {
        organizerId: user.id,
        title,
        description,
        categoryId,
        imageUrl,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        maxVolunteers: parseInt(maxVolunteers),
        status: 'draft', // Проект создается в черновике
        isPaid: true, // ВРЕМЕННО: Все проекты считаются оплаченными
      },
      include: {
        ...getCategoryInclude('ru'),
        organizer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Проверяем достижение "Лидер" — организатор создал первый проект
    checkAchievementsOnProjectCreated(user.id).catch(console.error);

    // ВРЕМЕННО: Счетчик бесплатных публикаций не уменьшается
    // Счетчик бесплатных публикаций уменьшается только после одобрения админом

    // Создаем задачи проекта, если они есть
    if (tasks && tasks.length > 0) {
      console.log('Создание задач проекта:', tasks.length);
      
      for (const task of tasks) {
        try {
          // Находим навык по имени, если указан
          let skillId = null;
          if (task.requiredSkill) {
            const skill = await prisma.skill.findFirst({
              where: { name: task.requiredSkill },
            });
            skillId = skill?.id || null;
          }

          await prisma.task.create({
            data: {
              projectId: project.id,
              title: task.title,
              description: task.description,
              requiredSkillId: skillId,
              requiredVolunteers: parseInt(task.requiredVolunteers) || 1,
              deadline: new Date(task.deadline),
              status: 'pending',
            },
          });
        } catch (taskError) {
          console.error('Error creating task:', taskError);
          // Продолжаем создание остальных задач
        }
      }
    }

    return NextResponse.json({
      message: 'Проект успешно создан',
      project: {
        ...project,
        category: formatCategoryWithTranslation(project.category)
      },
    });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании проекта' },
      { status: 500 }
    );
  }
}

// GET - Получить список проектов
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const categoryId = searchParams.get('categoryId');
    const organizerId = searchParams.get('organizerId');

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (organizerId) {
      where.organizerId = organizerId;
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        ...getCategoryInclude('ru'),
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            organizerProfile: {
              select: {
                organizationName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Преобразуем Decimal в number для координат и форматируем категории
    const projectsData = projects.map(project => ({
      ...project,
      latitude: project.latitude ? parseFloat(project.latitude.toString()) : null,
      longitude: project.longitude ? parseFloat(project.longitude.toString()) : null,
      category: formatCategoryWithTranslation(project.category)
    }));

    return NextResponse.json({ projects: projectsData });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении списка проектов' },
      { status: 500 }
    );
  }
}
