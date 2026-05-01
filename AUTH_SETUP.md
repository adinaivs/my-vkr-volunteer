# Настройка аутентификации

## Установленные зависимости

- `bcryptjs` - хеширование паролей
- `jose` - работа с JWT токенами
- `cookie` - управление куками

## Структура

```
lib/
  auth.ts          - функции для работы с сессиями (JWT)
  prisma.ts        - клиент Prisma

app/api/auth/
  register/        - регистрация волонтера
  register/organizer/ - регистрация организатора
  login/           - вход в систему
  logout/          - выход из системы
  me/              - получение текущего пользователя
  google/          - инициация OAuth Google
  google/callback/ - обработка callback от Google

app/
  login/           - страница входа
  register/        - выбор типа регистрации
  register/volunteer/   - регистрация волонтера
  register/organizer/   - регистрация организатора (2 шага)
  register/success/     - успешная регистрация организатора
  dashboard/       - защищенная страница (личный кабинет)

middleware.ts      - защита маршрутов
```

## Типы регистрации

### Регистрация волонтера (`/register/volunteer`)
Простая форма с полями:
- ФИО (имя и фамилия)
- Email
- Телефон
- Пароль и подтверждение
- Чекбокс согласия с правилами
- Кнопка "Войти через Google"

После регистрации волонтер сразу получает доступ к платформе.

### Регистрация организатора (`/register/organizer`)
Двухшаговая форма:

**Шаг 1 - Информация об организации:**
- ФИО представителя
- Название организации
- ИНН (14 цифр)
- ОКПО (8 цифр)
- Email организации
- Телефон организации
- Свидетельство о регистрации (файл)

**Шаг 2 - Создание пароля:**
- Пароль
- Подтверждение пароля
- Чекбокс согласия с правилами

После регистрации организатор:
1. Получает доступ к личному кабинету
2. Его аккаунт получает статус `verificationStatus: 'pending'`
3. Должен дождаться проверки администраторами (1-3 дня)
4. После подтверждения сможет создавать проекты

## Настройка Google OAuth

### 1. Создайте проект в Google Cloud Console

1. Перейдите на https://console.cloud.google.com/
2. Создайте новый проект или выберите существующий
3. Включите Google+ API

### 2. Настройте OAuth consent screen

1. В меню выберите "APIs & Services" → "OAuth consent screen"
2. Выберите "External" и нажмите "Create"
3. Заполните обязательные поля:
   - App name: "Волонтерская платформа"
   - User support email: ваш email
   - Developer contact information: ваш email
4. Нажмите "Save and Continue"
5. На странице "Scopes" нажмите "Add or Remove Scopes"
6. Выберите:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
7. Сохраните и продолжите

### 3. Создайте OAuth 2.0 Client ID

1. Перейдите в "APIs & Services" → "Credentials"
2. Нажмите "Create Credentials" → "OAuth client ID"
3. Выберите "Web application"
4. Заполните:
   - Name: "Volunteer Platform Web Client"
   - Authorized JavaScript origins:
     - `http://localhost:3000`
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/google/callback`
5. Нажмите "Create"
6. Скопируйте Client ID и Client Secret

### 4. Обновите .env файл

```env
GOOGLE_CLIENT_ID="ваш-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="ваш-client-secret"
```

### 5. Для продакшена

Добавьте в Google Console:
- Authorized JavaScript origins: `https://yourdomain.com`
- Authorized redirect URIs: `https://yourdomain.com/api/auth/google/callback`

И обновите в .env:
```env
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
JWT_SECRET="сгенерируйте-случайную-строку-минимум-32-символа"
```

## Использование

### Выбор типа регистрации
- Перейдите на `/register`
- Выберите "Я волонтёр" или "Я организатор"

### Регистрация волонтера
- Перейдите на `/register/volunteer`
- Заполните форму или используйте "Войти через Google"
- Сразу получите доступ к платформе

### Регистрация организатора
- Перейдите на `/register/organizer`
- Заполните информацию об организации (Шаг 1)
- Создайте пароль (Шаг 2)
- Дождитесь проверки администраторами

### Вход
- Перейдите на `/login`
- Введите email и пароль или используйте "Войти через Google"

### Защищенные маршруты
- Все маршруты `/dashboard/*` требуют авторизации
- При попытке доступа без авторизации происходит редирект на `/login`

## Безопасность

- Пароли хешируются с помощью bcryptjs (10 раундов)
- JWT токены хранятся в httpOnly куках
- Токены действительны 7 дней
- Middleware проверяет валидность токенов на каждом запросе
- Google OAuth пользователи создаются с пустым passwordHash

## API Endpoints

### POST /api/auth/register
Регистрация волонтера

Body:
```json
{
  "email": "user@example.com",
  "phone": "+996XXXXXXXXX",
  "password": "password123",
  "firstName": "Иван",
  "lastName": "Иванов",
  "city": "Бишкек",
  "role": "volunteer"
}
```

### POST /api/auth/register/organizer
Регистрация организатора

Body:
```json
{
  "email": "org@example.com",
  "phone": "+996XXXXXXXXX",
  "password": "password123",
  "firstName": "Иван",
  "lastName": "Иванов",
  "organizationName": "НПО Помощь",
  "inn": "12345678901234",
  "okpo": "12345678",
  "verificationDocUrl": "https://..."
}
```

Response:
```json
{
  "user": {...},
  "message": "Регистрация успешна. Ваш аккаунт будет проверен администраторами в течение 1-3 дней."
}
```

### POST /api/auth/login
Вход в систему

Body:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### POST /api/auth/logout
Выход из системы (удаление сессии)

### GET /api/auth/me
Получение данных текущего пользователя

### GET /api/auth/google
Инициация OAuth через Google (редирект)

### GET /api/auth/google/callback
Обработка callback от Google (автоматический)
