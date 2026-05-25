import { prisma } from './prisma';

// Определение функций для OpenAI Function Calling
export const AI_FUNCTIONS = [
  {
    name: 'get_active_projects',
    description: 'Получить список проектов. Для волонтеров - по умолчанию только проекты со статусом "recruiting" (набор волонтеров), куда можно подать заявку. Для организаторов - все их проекты.',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Категория проекта (необязательно)',
        },
        city: {
          type: 'string',
          description: 'Город проведения проекта (необязательно)',
        },
        limit: {
          type: 'number',
          description: 'Максимальное количество проектов для возврата (по умолчанию 10)',
          default: 10,
        },
        userId: {
          type: 'string',
          description: 'ID пользователя (передается автоматически)',
        },
        userRole: {
          type: 'string',
          description: 'Роль пользователя: volunteer, organizer, admin (передается автоматически)',
        },
        includeActive: {
          type: 'boolean',
          description: 'Включить активные и предстоящие проекты (для волонтеров, если они явно спрашивают про свои активные проекты)',
          default: false,
        },
      },
    },
  },
  {
    name: 'get_my_active_projects',
    description: 'Получить список проектов волонтера, в которых он УЖЕ участвует (активные и предстоящие проекты с одобренными заявками)',
    parameters: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'ID пользователя (передается автоматически)',
        },
      },
      required: ['userId'],
    },
  },
  {
    name: 'find_project_by_name_or_number',
    description: 'Найти проект по названию или номеру из списка. Используй когда пользователь спрашивает про конкретный проект, указывая его название или номер.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Название проекта или номер (например: "озеленение" или "1" или "проект номер 3")',
        },
        userId: {
          type: 'string',
          description: 'ID пользователя (передается автоматически)',
        },
        userRole: {
          type: 'string',
          description: 'Роль пользователя (передается автоматически)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_project_details',
    description: 'Получить детальную информацию о конкретном проекте по его ID',
    parameters: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'ID проекта',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_categories',
    description: 'Получить список всех доступных категорий проектов',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_user_statistics',
    description: 'Получить статистику пользователя (количество проектов, задач, часов волонтерства)',
    parameters: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'ID пользователя',
        },
      },
      required: ['userId'],
    },
  },
  {
    name: 'search_projects_by_skill',
    description: 'Найти проекты, требующие определенный навык',
    parameters: {
      type: 'object',
      properties: {
        skillName: {
          type: 'string',
          description: 'Название навыка',
        },
      },
      required: ['skillName'],
    },
  },
  {
    name: 'get_user_applications',
    description: 'Получить список заявок пользователя на проекты',
    parameters: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'ID пользователя',
        },
        status: {
          type: 'string',
          enum: ['pending', 'approved', 'rejected', 'cancelled'],
          description: 'Статус заявки (необязательно)',
        },
      },
      required: ['userId'],
    },
  },
  {
    name: 'get_upcoming_projects',
    description: 'Получить список предстоящих проектов',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Максимальное количество проектов (по умолчанию 5)',
          default: 5,
        },
      },
    },
  },
  {
    name: 'get_current_date',
    description: 'Получить текущую дату и время сервера. ВСЕГДА вызывай эту функцию первой, когда пользователь спрашивает про задачи, расписание, план на день, предстоящие или прошедшие события.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_today_tasks',
    description: 'Получить задачи и события волонтёра. Используй после get_current_date. Режимы: "today" — задачи на сегодня, "upcoming" — предстоящие задачи (дедлайн в будущем), "past" — прошедшие/выполненные задачи, "date" — задачи на конкретную дату.',
    parameters: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'ID пользователя (передается автоматически)',
        },
        mode: {
          type: 'string',
          enum: ['today', 'upcoming', 'past', 'date'],
          description: 'Режим выборки: today=сегодня, upcoming=предстоящие, past=прошедшие, date=конкретная дата',
          default: 'today',
        },
        date: {
          type: 'string',
          description: 'Дата в формате YYYY-MM-DD. Обязательна только для mode="date".',
        },
      },
      required: ['userId'],
    },
  },
];

// Реализация функций
export async function executeFunction(
  functionName: string,
  args: any
): Promise<string> {
  try {
    switch (functionName) {
      case 'get_active_projects':
        return await getActiveProjects(args);
      
      case 'get_my_active_projects':
        return await getMyActiveProjects(args);
      
      case 'find_project_by_name_or_number':
        return await findProjectByNameOrNumber(args);
      
      case 'get_project_details':
        return await getProjectDetails(args);
      
      case 'get_categories':
        return await getCategories();
      
      case 'get_user_statistics':
        return await getUserStatistics(args);
      
      case 'search_projects_by_skill':
        return await searchProjectsBySkill(args);
      
      case 'get_user_applications':
        return await getUserApplications(args);
      
      case 'get_upcoming_projects':
        return await getUpcomingProjects(args);

      case 'get_current_date':
        return await getCurrentDate();

      case 'get_today_tasks':
        return await getTodayTasks(args);
      
      default:
        return JSON.stringify({ error: 'Неизвестная функция' });
    }
  } catch (error: any) {
    console.error(`Ошибка выполнения функции ${functionName}:`, error);
    return JSON.stringify({ error: error.message });
  }
}

// Получить активные проекты
async function getActiveProjects(args: {
  category?: string;
  city?: string;
  limit?: number;
  userId?: string;
  userRole?: string;
  includeActive?: boolean;
}): Promise<string> {
  const { category, city, limit = 10, userId, userRole, includeActive = false } = args;

  const where: any = {};

  // Если пользователь - организатор, показываем только его проекты
  if (userRole === 'organizer' && userId) {
    where.organizerId = userId;
    // Для организатора показываем все статусы кроме deleted
  } else {
    // Для волонтеров и гостей
    if (includeActive) {
      // Если явно запросили активные - показываем recruiting, active, upcoming
      where.status = {
        in: ['recruiting', 'active', 'upcoming'],
      };
    } else {
      // По умолчанию - только recruiting (набор волонтеров)
      where.status = 'recruiting';
    }
  }

  if (city) {
    where.location = {
      contains: city,
      mode: 'insensitive',
    };
  }

  // Если указана категория, найдем её ID
  if (category) {
    const categoryRecord = await prisma.category.findFirst({
      where: {
        translations: {
          some: {
            name: {
              contains: category,
              mode: 'insensitive',
            },
          },
        },
      },
    });

    if (categoryRecord) {
      where.categoryId = categoryRecord.id;
    }
  }

  const projects = await prisma.project.findMany({
    where,
    take: limit,
    select: {
      id: true,
      title: true,
      description: true,
      location: true,
      startDate: true,
      endDate: true,
      maxVolunteers: true,
      currentVolunteers: true,
      status: true,
      category: {
        select: {
          translations: {
            where: { locale: 'ru' },
            select: { name: true },
          },
        },
      },
      organizer: {
        select: {
          firstName: true,
          lastName: true,
          organizerProfile: {
            select: {
              organizationName: true,
            },
          },
        },
      },
    },
    orderBy: {
      startDate: 'asc',
    },
  });

  // Маппинг статусов на русский
  const statusMap: Record<string, string> = {
    draft: 'Черновик',
    moderation: 'На модерации',
    rejected: 'Отклонен',
    recruiting: 'Набор волонтеров',
    upcoming: 'Скоро начнется',
    active: 'Активный',
    completed: 'Завершен',
    cancelled: 'Отменен',
    blocked: 'Заблокирован',
  };

  const formattedProjects = projects.map((p, index) => ({
    номер: index + 1,
    id: p.id,
    название: p.title,
    описание: p.description.substring(0, 150) + '...',
    категория: p.category.translations[0]?.name || 'Не указана',
    город: p.location,
    даты: `${new Date(p.startDate).toLocaleDateString('ru-RU')} - ${new Date(p.endDate).toLocaleDateString('ru-RU')}`,
    волонтеры: `${p.currentVolunteers}/${p.maxVolunteers}`,
    статус: statusMap[p.status] || p.status,
    организатор: p.organizer.organizerProfile?.organizationName || `${p.organizer.firstName} ${p.organizer.lastName}`,
  }));

  // Формируем карточки проектов (каждый проект - отдельная вертикальная таблица)
  let markdownCards = '';
  
  formattedProjects.forEach((p, idx) => {
    if (idx > 0) markdownCards += '\n\n---\n\n'; // Разделитель между проектами
    
    markdownCards += `**ПРОЕКТ ${p.номер}**\n\n`;
    markdownCards += '| Поле | Значение |\n';
    markdownCards += '|------|----------|\n';
    markdownCards += `| **Название** | ${p.название} |\n`;
    markdownCards += `| **Категория** | ${p.категория} |\n`;
    markdownCards += `| **Город** | ${p.город} |\n`;
    markdownCards += `| **Даты** | ${p.даты} |\n`;
    markdownCards += `| **Волонтеры** | ${p.волонтеры} |\n`;
    markdownCards += `| **Статус** | ${p.статус} |\n`;
    markdownCards += `| **Организатор** | ${p.организатор} |\n`;
    markdownCards += `| **Описание** | ${p.описание} |\n`;
  });

  const result: any = {
    всего_найдено: formattedProjects.length,
    проекты_карточки: markdownCards,
    проекты_список: formattedProjects.map(p => ({
      номер: p.номер,
      id: p.id,
      название: p.название,
    })),
  };

  // Добавляем информацию о роли для контекста
  if (userRole === 'organizer') {
    result.примечание = 'Показаны все твои проекты (включая черновики и на модерации). Спроси про конкретный проект по номеру или названию для подробностей.';
  } else if (includeActive) {
    result.примечание = 'Показаны проекты со статусами: набор волонтеров, активные, предстоящие. Спроси про конкретный проект по номеру или названию для подробностей.';
  } else {
    result.примечание = 'Показаны только проекты с набором волонтеров (можно подать заявку). Спроси про конкретный проект по номеру или названию для подробностей.';
  }

  return JSON.stringify(result, null, 2);
}

// Получить активные проекты волонтера (в которых он участвует)
async function getMyActiveProjects(args: { userId: string }): Promise<string> {
  if (!args.userId) {
    return JSON.stringify({ error: 'Требуется авторизация' });
  }

  // Находим все одобренные заявки волонтера
  const applications = await prisma.application.findMany({
    where: {
      volunteerId: args.userId,
      status: 'approved',
      project: {
        status: {
          in: ['recruiting', 'active', 'upcoming'],
        },
      },
    },
    include: {
      project: {
        include: {
          category: {
            include: {
              translations: {
                where: { locale: 'ru' },
              },
            },
          },
        },
      },
    },
  });

  // Фильтруем только те, где проект существует и активен
  const activeProjects = applications
    .filter((app) => app.project !== null)
    .map((app) => app.project);

  const statusMap: Record<string, string> = {
    recruiting: 'Набор волонтеров',
    upcoming: 'Скоро начнется',
    active: 'Активный',
  };

  const formattedProjects = activeProjects.map((p) => ({
    id: p.id,
    название: p.title,
    описание: p.description.substring(0, 200) + '...',
    категория: p.category.translations[0]?.name || 'Не указана',
    город: p.location,
    даты: `${new Date(p.startDate).toLocaleDateString('ru-RU')} - ${new Date(p.endDate).toLocaleDateString('ru-RU')}`,
    волонтеры: `${p.currentVolunteers}/${p.maxVolunteers}`,
    статус: statusMap[p.status] || p.status,
  }));

  return JSON.stringify({
    всего_найдено: formattedProjects.length,
    проекты: formattedProjects,
    примечание: 'Показаны проекты, в которых ты участвуешь (с одобренными заявками)',
  }, null, 2);
}

// Найти проект по названию или номеру
async function findProjectByNameOrNumber(args: {
  query: string;
  userId?: string;
  userRole?: string;
}): Promise<string> {
  const { query, userId, userRole } = args;

  // Проверяем, является ли query числом (номером проекта)
  const isNumber = /^\d+$/.test(query.trim());

  let projects;

  if (isNumber) {
    // Поиск по номеру - получаем список проектов и берем нужный по индексу
    const projectNumber = parseInt(query.trim());
    
    const where: any = {};
    
    if (userRole === 'organizer' && userId) {
      where.organizerId = userId;
    } else {
      where.status = 'recruiting';
    }

    projects = await prisma.project.findMany({
      where,
      take: 100, // Берем больше, чтобы найти нужный номер
      include: {
        category: {
          include: {
            translations: {
              where: { locale: 'ru' },
            },
          },
        },
        organizer: {
          include: {
            organizerProfile: true,
          },
        },
        tasks: {
          include: {
            skill: {
              include: {
                translations: {
                  where: { locale: 'ru' },
                },
              },
            },
          },
          orderBy: {
            deadline: 'asc',
          },
        },
        applications: {
          where: { status: 'approved' },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    // Берем проект по номеру (номер начинается с 1)
    const project = projects[projectNumber - 1];

    if (!project) {
      return JSON.stringify({
        error: `Проект с номером ${projectNumber} не найден. Всего проектов: ${projects.length}`,
      });
    }

    // Возвращаем детали найденного проекта
    return await formatProjectDetails(project);
  } else {
    // Поиск по названию
    const where: any = {
      title: {
        contains: query,
        mode: 'insensitive',
      },
    };

    if (userRole === 'organizer' && userId) {
      where.organizerId = userId;
    } else {
      where.status = 'recruiting';
    }

    const project = await prisma.project.findFirst({
      where,
      include: {
        category: {
          include: {
            translations: {
              where: { locale: 'ru' },
            },
          },
        },
        organizer: {
          include: {
            organizerProfile: true,
          },
        },
        tasks: {
          include: {
            skill: {
              include: {
                translations: {
                  where: { locale: 'ru' },
                },
              },
            },
          },
          orderBy: {
            deadline: 'asc',
          },
        },
        applications: {
          where: { status: 'approved' },
        },
      },
    });

    if (!project) {
      return JSON.stringify({
        error: `Проект с названием "${query}" не найден`,
      });
    }

    // Возвращаем детали найденного проекта
    return await formatProjectDetails(project);
  }
}

// Вспомогательная функция для форматирования деталей проекта
async function formatProjectDetails(project: any): Promise<string> {
  // Маппинг статусов
  const statusMap: Record<string, string> = {
    draft: 'Черновик',
    moderation: 'На модерации',
    rejected: 'Отклонен',
    recruiting: 'Набор волонтеров',
    upcoming: 'Скоро начнется',
    active: 'Активный',
    completed: 'Завершен',
    cancelled: 'Отменен',
    blocked: 'Заблокирован',
  };

  const taskStatusMap: Record<string, string> = {
    pending: 'Ожидает',
    in_progress: 'В процессе',
    completed: 'Завершена',
    overdue: 'Просрочена',
    cancelled: 'Отменена',
  };

  // Вычисляем дни до начала
  const today = new Date();
  const startDate = new Date(project.startDate);
  const daysUntilStart = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  // Вычисляем продолжительность проекта
  const endDate = new Date(project.endDate);
  const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // Процент заполненности
  const fillPercentage = project.maxVolunteers > 0 
    ? Math.round((project.currentVolunteers / project.maxVolunteers) * 100) 
    : 0;

  const formatted = {
    основная_информация: {
      название: project.title,
      категория: project.category.translations[0]?.name || 'Не указана',
      статус: statusMap[project.status] || project.status,
      описание_полное: project.description,
    },
    
    место_и_время: {
      город: project.location,
      координаты: project.latitude && project.longitude 
        ? `${project.latitude}, ${project.longitude}` 
        : null,
      дата_начала: new Date(project.startDate).toLocaleDateString('ru-RU'),
      дата_окончания: new Date(project.endDate).toLocaleDateString('ru-RU'),
      продолжительность_дней: durationDays,
      дней_до_начала: daysUntilStart > 0 ? daysUntilStart : 'Уже начался',
    },
    
    волонтеры: {
      текущее_количество: project.currentVolunteers,
      максимум: project.maxVolunteers,
      осталось_мест: project.maxVolunteers - project.currentVolunteers,
      процент_заполненности: fillPercentage,
      одобренных_заявок: project.applications.length,
    },
    
    организатор: {
      название_организации: project.organizer.organizerProfile?.organizationName || null,
      контактное_лицо: `${project.organizer.firstName} ${project.organizer.lastName}`,
      email: project.organizer.email,
      телефон: project.organizer.phone,
    },
    
    задачи: project.tasks.map((t: any, index: number) => {
      const taskDeadline = new Date(t.deadline);
      const daysUntilDeadline = Math.ceil((taskDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        номер: index + 1,
        название: t.title,
        описание: t.description,
        требуемый_навык: t.skill?.translations[0]?.name || t.skill?.name || 'Не требуется',
        волонтеров: {
          текущее: t.currentVolunteers,
          требуется: t.requiredVolunteers,
          осталось: t.requiredVolunteers - t.currentVolunteers,
        },
        дедлайн: taskDeadline.toLocaleDateString('ru-RU'),
        дней_до_дедлайна: daysUntilDeadline > 0 ? daysUntilDeadline : 'Просрочена',
        статус: taskStatusMap[t.status] || t.status,
      };
    }),
    
    дополнительная_информация: {
      можно_подать_заявку: project.status === 'recruiting',
      есть_свободные_места: project.currentVolunteers < project.maxVolunteers,
      всего_задач: project.tasks.length,
      задач_с_требуемыми_навыками: project.tasks.filter((t: any) => t.skill).length,
    },
  };

  return JSON.stringify(formatted, null, 2);
}

// Получить детали проекта по ID
async function getProjectDetails(args: { projectId: string }): Promise<string> {
  const project = await prisma.project.findUnique({
    where: { id: args.projectId },
    include: {
      category: {
        include: {
          translations: {
            where: { locale: 'ru' },
          },
        },
      },
      organizer: {
        include: {
          organizerProfile: true,
        },
      },
      tasks: {
        include: {
          skill: {
            include: {
              translations: {
                where: { locale: 'ru' },
              },
            },
          },
        },
        orderBy: {
          deadline: 'asc',
        },
      },
      applications: {
        where: { status: 'approved' },
      },
    },
  });

  if (!project) {
    return JSON.stringify({ error: 'Проект не найден' });
  }

  return await formatProjectDetails(project);
}

// Получить категории
async function getCategories(): Promise<string> {
  const categories = await prisma.category.findMany({
    include: {
      translations: {
        where: { locale: 'ru' },
      },
      _count: {
        select: {
          projects: {
            where: {
              status: {
                in: ['recruiting', 'active', 'upcoming'],
              },
            },
          },
        },
      },
    },
  });

  const formatted = categories.map((c) => ({
    название: c.translations[0]?.name || c.slug,
    иконка: c.icon,
    активных_проектов: c._count.projects,
  }));

  return JSON.stringify({ категории: formatted }, null, 2);
}

// Получить статистику пользователя
async function getUserStatistics(args: { userId: string }): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: args.userId },
    include: {
      volunteerProfile: true,
      applications: {
        where: { status: 'approved' },
      },
      taskAssignments: {
        where: { status: 'confirmed' },
        include: {
          task: {
            include: {
              project: true,
            },
          },
        },
      },
      achievements: {
        include: {
          achievement: {
            include: {
              translations: {
                where: { locale: 'ru' },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    return JSON.stringify({ error: 'Пользователь не найден' });
  }

  // Подсчет часов волонтерства (примерная оценка)
  const totalHours = user.taskAssignments.reduce((sum, assignment) => {
    const project = assignment.task.project;
    const projectDays = Math.ceil(
      (new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / 
      (1000 * 60 * 60 * 24)
    );
    return sum + Math.min(projectDays * 4, 40); // Примерно 4 часа в день, макс 40 часов на проект
  }, 0);

  const formatted = {
    имя: `${user.firstName} ${user.lastName}`,
    роль: user.role,
    город: user.city,
    статистика: {
      всего_заявок: user.applications.length,
      выполнено_задач: user.taskAssignments.length,
      завершено_проектов: user.volunteerProfile?.completedProjects || 0,
      часов_волонтерства: totalHours,
      рейтинг: user.volunteerProfile?.trustScore.toString() || '0',
    },
    достижения: user.achievements.map((ua) => ({
      название: ua.achievement.translations[0]?.name || 'Достижение',
      награда: ua.rewardText,
      получено: new Date(ua.createdAt).toLocaleDateString('ru-RU'),
      действует_до: new Date(ua.expiresAt).toLocaleDateString('ru-RU'),
    })),
  };

  return JSON.stringify(formatted, null, 2);
}

// Поиск проектов по навыку
async function searchProjectsBySkill(args: { skillName: string }): Promise<string> {
  const skill = await prisma.skill.findFirst({
    where: {
      OR: [
        { name: { contains: args.skillName, mode: 'insensitive' } },
        {
          translations: {
            some: {
              name: { contains: args.skillName, mode: 'insensitive' },
            },
          },
        },
      ],
    },
  });

  if (!skill) {
    return JSON.stringify({ 
      сообщение: `Навык "${args.skillName}" не найден в системе`,
      проекты: [],
    });
  }

  const tasks = await prisma.task.findMany({
    where: {
      requiredSkillId: skill.id,
      project: {
        status: {
          in: ['recruiting', 'active', 'upcoming'],
        },
      },
    },
    include: {
      project: {
        include: {
          category: {
            include: {
              translations: {
                where: { locale: 'ru' },
              },
            },
          },
        },
      },
    },
    take: 10,
  });

  const formatted = tasks.map((t) => ({
    проект: t.project.title,
    задача: t.title,
    категория: t.project.category.translations[0]?.name || 'Не указана',
    город: t.project.location,
    дедлайн: new Date(t.deadline).toLocaleDateString('ru-RU'),
    нужно_волонтеров: `${t.currentVolunteers}/${t.requiredVolunteers}`,
  }));

  return JSON.stringify({
    навык: skill.name,
    найдено_задач: formatted.length,
    задачи: formatted,
  }, null, 2);
}

// Получить заявки пользователя
async function getUserApplications(args: {
  userId: string;
  status?: string;
}): Promise<string> {
  const where: any = {
    volunteerId: args.userId,
  };

  if (args.status) {
    where.status = args.status;
  }

  const applications = await prisma.application.findMany({
    where,
    include: {
      project: {
        include: {
          category: {
            include: {
              translations: {
                where: { locale: 'ru' },
              },
            },
          },
        },
      },
    },
    orderBy: {
      appliedAt: 'desc',
    },
  });

  const formatted = applications.map((app) => ({
    проект: app.project.title,
    категория: app.project.category.translations[0]?.name || 'Не указана',
    статус: app.status,
    дата_подачи: new Date(app.appliedAt).toLocaleDateString('ru-RU'),
    дата_рассмотрения: app.reviewedAt 
      ? new Date(app.reviewedAt).toLocaleDateString('ru-RU') 
      : 'Не рассмотрена',
    причина_отказа: app.rejectionReason || null,
  }));

  return JSON.stringify({
    всего_заявок: formatted.length,
    заявки: formatted,
  }, null, 2);
}

// Получить предстоящие проекты
async function getUpcomingProjects(args: { limit?: number }): Promise<string> {
  const { limit = 5 } = args;

  const projects = await prisma.project.findMany({
    where: {
      status: {
        in: ['recruiting', 'upcoming'],
      },
      startDate: {
        gte: new Date(),
      },
    },
    take: limit,
    include: {
      category: {
        include: {
          translations: {
            where: { locale: 'ru' },
          },
        },
      },
    },
    orderBy: {
      startDate: 'asc',
    },
  });

  const formatted = projects.map((p) => ({
    id: p.id,
    название: p.title,
    категория: p.category.translations[0]?.name || 'Не указана',
    город: p.location,
    начало: new Date(p.startDate).toLocaleDateString('ru-RU'),
    дней_до_начала: Math.ceil(
      (new Date(p.startDate).getTime() - new Date().getTime()) / 
      (1000 * 60 * 60 * 24)
    ),
    волонтеры: `${p.currentVolunteers}/${p.maxVolunteers}`,
  }));

  return JSON.stringify({
    предстоящие_проекты: formatted,
  }, null, 2);
}

// Получить текущую дату и время сервера
async function getCurrentDate(): Promise<string> {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  return JSON.stringify({
    today: todayStr,
    formatted: now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
    time: now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    dayOfWeek: now.toLocaleDateString('ru-RU', { weekday: 'long', timeZone: 'UTC' }),
  });
}

// Получить задачи волонтёра (сегодня / предстоящие / прошедшие / конкретная дата)
async function getTodayTasks(args: {
  userId: string;
  mode?: 'today' | 'upcoming' | 'past' | 'date';
  date?: string;
}): Promise<string> {
  if (!args.userId) {
    return JSON.stringify({ error: 'Требуется авторизация' });
  }

  const mode = args.mode ?? 'today';

  // Сегодняшняя дата в UTC (PostgreSQL @db.Date хранит как T00:00:00.000Z)
  const nowUtc = new Date();
  const todayStr = nowUtc.toISOString().split('T')[0]; // YYYY-MM-DD

  const todayUtcStart = new Date(todayStr + 'T00:00:00.000Z');
  const todayUtcEnd   = new Date(todayStr + 'T23:59:59.999Z');

  let deadlineFilter: any;
  let eventsFilter: any;
  let modeLabel: string;

  if (mode === 'today') {
    deadlineFilter = { gte: todayUtcStart, lte: todayUtcEnd };
    eventsFilter = {
      OR: [
        { startDate: { gte: todayUtcStart, lte: todayUtcEnd } },
        { startDate: { lte: todayUtcStart }, endDate: { gte: todayUtcStart } },
      ],
    };
    modeLabel = `сегодня (${todayUtcStart.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })})`;

  } else if (mode === 'upcoming') {
    deadlineFilter = { gt: todayUtcEnd };
    eventsFilter = { startDate: { gt: todayUtcEnd } };
    modeLabel = 'предстоящие (начиная с завтра)';

  } else if (mode === 'past') {
    deadlineFilter = { lt: todayUtcStart };
    eventsFilter = { endDate: { lt: todayUtcStart } };
    modeLabel = 'прошедшие (до сегодня)';

  } else if (mode === 'date' && args.date) {
    const dayUtcStart = new Date(args.date + 'T00:00:00.000Z');
    const dayUtcEnd   = new Date(args.date + 'T23:59:59.999Z');
    deadlineFilter = { gte: dayUtcStart, lte: dayUtcEnd };
    eventsFilter = {
      OR: [
        { startDate: { gte: dayUtcStart, lte: dayUtcEnd } },
        { startDate: { lte: dayUtcStart }, endDate: { gte: dayUtcStart } },
      ],
    };
    modeLabel = dayUtcStart.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

  } else {
    deadlineFilter = { gte: todayUtcStart, lte: todayUtcEnd };
    eventsFilter = {
      OR: [
        { startDate: { gte: todayUtcStart, lte: todayUtcEnd } },
        { startDate: { lte: todayUtcStart }, endDate: { gte: todayUtcStart } },
      ],
    };
    modeLabel = 'сегодня';
  }

  const assignmentStatusFilter = mode === 'past'
    ? { in: ['assigned', 'completed', 'confirmed'] }
    : { notIn: ['cancelled', 'rejected'] };

  const [assignments, personalEvents] = await Promise.all([
    prisma.taskAssignment.findMany({
      where: {
        volunteerId: args.userId,
        status: assignmentStatusFilter,
        task: { deadline: deadlineFilter },
      },
      include: {
        task: {
          include: {
            project: { select: { id: true, title: true, status: true, location: true } },
            skill: { include: { translations: { where: { locale: 'ru' } } } },
          },
        },
      },
      orderBy: { task: { deadline: mode === 'past' ? 'desc' : 'asc' } },
      take: 20,
    }),
    prisma.calendarEvent.findMany({
      where: { userId: args.userId, ...eventsFilter },
      orderBy: { startDate: mode === 'past' ? 'desc' : 'asc' },
      take: 10,
    }),
  ]);

  const assignmentStatusMap: Record<string, string> = {
    assigned: 'Назначена',
    completed: 'Выполнена (ожидает подтверждения)',
    confirmed: 'Подтверждена ✓',
  };

  const formattedTasks = assignments.map((a) => ({
    задача: a.task.title,
    описание: a.task.description,
    проект: a.task.project.title,
    место: a.task.project.location,
    навык: (a.task.skill as any)?.translations?.[0]?.name || (a.task.skill as any)?.name || 'Не требуется',
    дедлайн: new Date(a.task.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
    статус: assignmentStatusMap[a.status] || a.status,
  }));

  const formattedEvents = personalEvents.map((e) => ({
    название: e.title,
    описание: e.description || null,
    дата: new Date(e.startDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' }),
    время: e.isAllDay ? 'Весь день' : `${e.startTime || '?'} — ${e.endTime || '?'}`,
    место: e.location || null,
  }));

  const result: any = {
    период: modeLabel,
    текущая_дата: todayStr,
    задачи: formattedTasks,
    личные_события: formattedEvents,
    итого: { задач: formattedTasks.length, личных_событий: formattedEvents.length },
  };

  if (formattedTasks.length === 0 && formattedEvents.length === 0) {
    const emptyMessages: Record<string, string> = {
      today: 'На сегодня задач и событий нет. Отличный день чтобы найти новый проект!',
      upcoming: 'Предстоящих задач нет. Можешь найти новый проект в каталоге!',
      past: 'Прошедших задач не найдено.',
      date: `На ${modeLabel} задач и событий нет.`,
    };
    result.сообщение = emptyMessages[mode] || 'Задач не найдено.';
  }

  return JSON.stringify(result, null, 2);
}
