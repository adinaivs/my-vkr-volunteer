/**
 * Юнит-тесты: Функции валидации проектов и заявок
 */

// ── Вспомогательные функции ────────────────────────────────────────────────

type ProjectStatus =
  | 'draft' | 'moderation' | 'rejected' | 'recruiting'
  | 'upcoming' | 'active' | 'completed' | 'cancelled' | 'blocked';

function validateProjectInput(body: Record<string, unknown>): string | null {
  const required = ['title', 'description', 'categoryId', 'location', 'startDate', 'endDate'];
  for (const field of required) {
    if (!body[field]) return `Поле "${field}" обязательно`;
  }
  const max = Number(body.maxVolunteers);
  if (isNaN(max) || max < 1) return 'Количество волонтёров должно быть не менее 1';
  const start = new Date(body.startDate as string);
  const end = new Date(body.endDate as string);
  if (end <= start) return 'Дата окончания должна быть позже даты начала';
  return null;
}

function canApplyToProject(projectStatus: ProjectStatus, userRole: string): string | null {
  if (userRole !== 'volunteer') return 'Только волонтеры могут подавать заявки';
  if (projectStatus !== 'recruiting') return 'Подача заявок доступна только для проектов в статусе "recruiting"';
  return null;
}

function canPublishProject(
  projectStatus: ProjectStatus,
  isApprovedByAdmin: boolean
): string | null {
  if (!isApprovedByAdmin) return 'Аккаунт организатора не подтверждён администратором';
  if (projectStatus !== 'draft') return 'Можно публиковать только черновики';
  return null;
}

// ── Тесты ──────────────────────────────────────────────────────────────────

describe('Сценарий 3. Функция validateProjectInput()', () => {
  const validProject = {
    title: 'Озеленение парка',
    description: 'Посадка деревьев в городском парке',
    categoryId: 'uuid-category',
    location: 'Бишкек',
    startDate: '2026-07-01',
    endDate: '2026-07-10',
    maxVolunteers: 20,
  };

  test('Валидный проект — ошибок нет', () => {
    expect(validateProjectInput(validProject)).toBeNull();
  });

  test('Отсутствует заголовок — ошибка', () => {
    expect(validateProjectInput({ ...validProject, title: '' }))
      .toBe('Поле "title" обязательно');
  });

  test('Количество волонтёров = 0 — ошибка', () => {
    expect(validateProjectInput({ ...validProject, maxVolunteers: 0 }))
      .toBe('Количество волонтёров должно быть не менее 1');
  });

  test('Дата окончания раньше начала — ошибка', () => {
    expect(validateProjectInput({ ...validProject, startDate: '2026-08-01', endDate: '2026-07-01' }))
      .toBe('Дата окончания должна быть позже даты начала');
  });
});

describe('Сценарий 4. Функция canApplyToProject()', () => {
  test('Волонтёр подаёт заявку на активный набор — разрешено', () => {
    expect(canApplyToProject('recruiting', 'volunteer')).toBeNull();
  });

  test('Организатор пытается подать заявку — запрещено', () => {
    expect(canApplyToProject('recruiting', 'organizer'))
      .toBe('Только волонтеры могут подавать заявки');
  });

  test('Проект завершён — заявка запрещена', () => {
    expect(canApplyToProject('completed', 'volunteer'))
      .toBe('Подача заявок доступна только для проектов в статусе "recruiting"');
  });

  test('Проект на модерации — заявка запрещена', () => {
    expect(canApplyToProject('moderation', 'volunteer'))
      .toBe('Подача заявок доступна только для проектов в статусе "recruiting"');
  });
});

describe('Сценарий 5. Функция canPublishProject()', () => {
  test('Подтверждённый организатор публикует черновик — разрешено', () => {
    expect(canPublishProject('draft', true)).toBeNull();
  });

  test('Организатор не подтверждён — публикация запрещена', () => {
    expect(canPublishProject('draft', false))
      .toBe('Аккаунт организатора не подтверждён администратором');
  });

  test('Попытка повторно опубликовать уже опубликованный проект — ошибка', () => {
    expect(canPublishProject('recruiting', true))
      .toBe('Можно публиковать только черновики');
  });
});
