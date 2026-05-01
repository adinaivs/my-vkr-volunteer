# Руководство по регистрации

## Обзор

Платформа поддерживает два типа пользователей с разными процессами регистрации:

1. **Волонтёры** - простая регистрация с мгновенным доступом
2. **Организаторы** - расширенная регистрация с проверкой администраторами

## Маршруты

- `/register` - выбор типа регистрации
- `/register/volunteer` - регистрация волонтера
- `/register/organizer` - регистрация организатора
- `/register/success` - страница успешной регистрации организатора
- `/login` - вход в систему

## Регистрация волонтера

### Поля формы:
- ФИО (имя и фамилия)
- Email
- Телефон (+996XXXXXXXXX)
- Пароль (минимум 6 символов)
- Подтверждение пароля
- Согласие с правилами платформы

### Альтернатива:
- Вход через Google OAuth

### После регистрации:
- Автоматическое создание профиля волонтера
- Мгновенный доступ к платформе
- Редирект на `/dashboard`

## Регистрация организатора

### Шаг 1: Информация об организации

**Обязательные поля:**
- ФИО представителя (полное имя)
- Название организации
- ИНН - 14 цифр (идентификационный налоговый номер)
- ОКПО - 8 цифр (общий идентификационный код предприятий)
- Email организации
- Телефон организации (+996XXXXXXXXX)

**Опциональные поля:**
- Свидетельство о регистрации (скан/фото в формате JPG, PNG, PDF)

### Шаг 2: Создание пароля

**Поля:**
- Пароль (минимум 6 символов)
- Подтверждение пароля
- Согласие с правилами платформы

### После регистрации:

1. **Создается аккаунт** со статусом `verificationStatus: 'pending'`
2. **Доступ к личному кабинету** - можно войти и заполнить дополнительную информацию
3. **Ожидание проверки** - 1-3 рабочих дня
4. **Уведомление на email** - о результатах проверки
5. **После подтверждения** - возможность создавать проекты

### Статусы верификации:
- `pending` - ожидает проверки
- `verified` - подтверждено
- `rejected` - отклонено
- `blocked` - заблокировано

## Валидация

### Общие правила:
- Email должен быть уникальным
- Телефон должен быть уникальным
- Пароль минимум 6 символов
- Все обязательные поля должны быть заполнены

### Для организаторов:
- ИНН должен содержать ровно 14 цифр
- ОКПО должен содержать ровно 8 цифр
- ИНН должен быть уникальным (одна организация = один аккаунт)
- Файл документа: JPG, PNG, PDF (макс. 5 МБ)

## База данных

### Таблица `users`:
```sql
- id (UUID)
- email (unique)
- phone (unique)
- passwordHash
- firstName
- lastName
- city
- role (volunteer | organizer | admin)
- status (active | inactive | blocked | deleted)
- avatarUrl
- createdAt
- updatedAt
```

### Таблица `volunteer_profiles`:
```sql
- id (UUID)
- userId (FK -> users.id)
- bio
- availableTime
- trustScore
- completedTasks
- completedProjects
```

### Таблица `organizer_profiles`:
```sql
- id (UUID)
- userId (FK -> users.id)
- organizationName
- inn (14 digits)
- okpo (8 digits)
- legalAddress
- actualAddress
- verificationStatus (pending | verified | rejected | blocked)
- verificationDocUrl
- verificationComment
- verifiedAt
- freePostsRemaining (default: 3)
- totalPaidPosts (default: 0)
```

## Безопасность

- Пароли хешируются с помощью bcryptjs (10 раундов)
- JWT токены хранятся в httpOnly cookies
- Токены действительны 7 дней
- Middleware проверяет валидность токенов на каждом запросе
- Google OAuth пользователи создаются с пустым passwordHash

## Примеры использования

### Регистрация волонтера (API):
```javascript
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'volunteer@example.com',
    phone: '+996555123456',
    password: 'securepass123',
    firstName: 'Айгуль',
    lastName: 'Касымова',
    city: 'Бишкек',
    role: 'volunteer'
  })
});
```

### Регистрация организатора (API):
```javascript
const response = await fetch('/api/auth/register/organizer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'npo@example.com',
    phone: '+996555654321',
    password: 'securepass123',
    firstName: 'Тимур',
    lastName: 'Бекмуратов',
    organizationName: 'НПО "Помощь детям"',
    inn: '12345678901234',
    okpo: '12345678',
    verificationDocUrl: null // или URL загруженного документа
  })
});
```

## Дальнейшие улучшения

### TODO:
- [ ] Реализовать загрузку файлов на сервер (API endpoint `/api/upload`)
- [ ] Добавить выбор города из списка
- [ ] Добавить поля юридического и фактического адреса для организаторов
- [ ] Реализовать email уведомления о статусе верификации
- [ ] Добавить админ-панель для проверки организаторов
- [ ] Реализовать восстановление пароля
- [ ] Добавить двухфакторную аутентификацию (опционально)
- [ ] Реализовать верификацию email адреса
