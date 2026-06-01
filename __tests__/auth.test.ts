/**
 * Юнит-тесты: Функции регистрации и авторизации
 * Тестируется валидация входных данных без обращения к БД
 */

// ── Вспомогательные функции (вынесены из логики маршрута) ─────────────────

function validateRegisterInput(body: Record<string, unknown>): string | null {
  const required = ['email', 'phone', 'password', 'firstName', 'lastName', 'city', 'role'];
  for (const field of required) {
    if (!body[field]) return 'Все поля обязательны';
  }
  if (!['volunteer', 'organizer'].includes(body.role as string)) {
    return 'Неверная роль';
  }
  if (typeof body.email === 'string' && !body.email.includes('@')) {
    return 'Некорректный формат email';
  }
  if (typeof body.password === 'string' && body.password.length < 6) {
    return 'Пароль должен содержать минимум 6 символов';
  }
  return null;
}

function validateLoginInput(body: Record<string, unknown>): string | null {
  if (!body.email || !body.password) return 'Email и пароль обязательны';
  return null;
}

// ── Тесты ─────────────────────────────────────────────────────────────────

describe('Сценарий 1. Функция validateRegisterInput()', () => {
  test('Валидные данные — ошибок нет', () => {
    const input = {
      email: 'volunteer@test.kg',
      phone: '+996700123456',
      password: 'securePass1',
      firstName: 'Айгуль',
      lastName: 'Асанова',
      city: 'Бишкек',
      role: 'volunteer',
    };
    expect(validateRegisterInput(input)).toBeNull();
  });

  test('Отсутствует обязательное поле firstName — ошибка', () => {
    const input = {
      email: 'test@test.kg',
      phone: '+996700000000',
      password: 'pass123',
      firstName: '',
      lastName: 'Иванов',
      city: 'Ош',
      role: 'volunteer',
    };
    expect(validateRegisterInput(input)).toBe('Все поля обязательны');
  });

  test('Неверная роль — ошибка', () => {
    const input = {
      email: 'test@test.kg',
      phone: '+996700000000',
      password: 'pass123',
      firstName: 'Иван',
      lastName: 'Иванов',
      city: 'Бишкек',
      role: 'manager',
    };
    expect(validateRegisterInput(input)).toBe('Неверная роль');
  });

  test('Некорректный формат email — ошибка', () => {
    const input = {
      email: 'not-an-email',
      phone: '+996700000000',
      password: 'pass123',
      firstName: 'Иван',
      lastName: 'Иванов',
      city: 'Бишкек',
      role: 'organizer',
    };
    expect(validateRegisterInput(input)).toBe('Некорректный формат email');
  });

  test('Пароль короче 6 символов — ошибка', () => {
    const input = {
      email: 'user@test.kg',
      phone: '+996700000000',
      password: '123',
      firstName: 'Иван',
      lastName: 'Иванов',
      city: 'Бишкек',
      role: 'volunteer',
    };
    expect(validateRegisterInput(input)).toBe('Пароль должен содержать минимум 6 символов');
  });
});

describe('Сценарий 2. Функция validateLoginInput()', () => {
  test('Валидные данные — ошибок нет', () => {
    expect(validateLoginInput({ email: 'user@test.kg', password: 'pass123' })).toBeNull();
  });

  test('Отсутствует email — ошибка', () => {
    expect(validateLoginInput({ email: '', password: 'pass123' }))
      .toBe('Email и пароль обязательны');
  });

  test('Отсутствует пароль — ошибка', () => {
    expect(validateLoginInput({ email: 'user@test.kg', password: '' }))
      .toBe('Email и пароль обязательны');
  });

  test('Оба поля пустые — ошибка', () => {
    expect(validateLoginInput({ email: '', password: '' }))
      .toBe('Email и пароль обязательны');
  });
});
