# Настройка двухфакторной аутентификации (2FA)

## Что реализовано

### 1. Регистрация с подтверждением email
- При регистрации (волонтер или организатор) на email отправляется 6-значный код
- Код действителен 10 минут
- После ввода кода:
  - **Волонтер**: создается аккаунт и пользователь перенаправляется в дашборд
  - **Организатор**: создается аккаунт со статусом "pending" и пользователь видит сообщение о необходимости проверки администратором (1-3 дня)

### 2. Восстановление пароля
- Пользователь вводит email на странице "Забыли пароль"
- На email отправляется 6-значный код
- После ввода кода пользователь может установить новый пароль

## Настройка SMTP для отправки email

### Вариант 1: Gmail (рекомендуется для разработки)

1. Включите двухфакторную аутентификацию в вашем Google аккаунте
2. Создайте App Password:
   - Перейдите на https://myaccount.google.com/apppasswords
   - Выберите "Mail" и "Other (Custom name)"
   - Скопируйте сгенерированный пароль

3. Добавьте в `.env`:
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM="your-email@gmail.com"
```

### Вариант 2: Другие SMTP провайдеры

#### Mail.ru
```env
SMTP_HOST="smtp.mail.ru"
SMTP_PORT="587"
SMTP_USER="your-email@mail.ru"
SMTP_PASSWORD="your-password"
SMTP_FROM="your-email@mail.ru"
```

#### Yandex
```env
SMTP_HOST="smtp.yandex.ru"
SMTP_PORT="587"
SMTP_USER="your-email@yandex.ru"
SMTP_PASSWORD="your-password"
SMTP_FROM="your-email@yandex.ru"
```

## Структура базы данных

### EmailVerificationToken
Хранит временные данные регистрации до подтверждения email:
- `email` - email пользователя (primary key)
- `code` - 6-значный код верификации
- `firstName`, `lastName`, `phone`, `passwordHash`, `city`, `role` - данные для создания пользователя
- `organizationName`, `inn`, `okpo`, `legalAddress`, `actualAddress`, `verificationDocUrl` - дополнительные поля для организатора (опциональные)
- `expiresAt` - время истечения кода (10 минут)

### PasswordResetToken
Хранит коды для восстановления пароля:
- `email` - email пользователя (primary key)
- `code` - 6-значный код
- `expiresAt` - время истечения кода (10 минут)

## API Endpoints

### Регистрация
1. `POST /api/auth/register` - отправка данных регистрации, получение кода на email
2. `POST /api/auth/verify-email` - подтверждение кода и создание аккаунта

### Восстановление пароля
1. `POST /api/auth/forgot-password` - запрос кода восстановления
2. `POST /api/auth/verify-reset-code` - проверка кода
3. `POST /api/auth/reset-password` - установка нового пароля

## Страницы

- `/register/verify?email=...` - ввод кода подтверждения регистрации
- `/forgot-password` - запрос восстановления пароля
- `/forgot-password/verify?email=...` - ввод кода восстановления
- `/forgot-password/reset?email=...&code=...` - установка нового пароля

## Безопасность

- Коды действительны только 10 минут
- Коды хранятся в базе данных (не в JWT)
- При истечении кода пользователь должен запросить новый
- Пароли хешируются с помощью bcrypt
- Email не раскрывается при запросе восстановления пароля (защита от перечисления пользователей)

## Тестирование

1. Настройте SMTP в `.env`
2. Запустите приложение: `npm run dev`
3. Зарегистрируйтесь на `/register/volunteer` или `/register/organizer`
4. Проверьте email и введите полученный код
5. Попробуйте восстановить пароль через `/forgot-password`

## Troubleshooting

### Email не приходит
- Проверьте настройки SMTP в `.env`
- Проверьте папку "Спам"
- Убедитесь, что App Password создан правильно (для Gmail)
- Проверьте логи сервера на наличие ошибок

### Код не принимается
- Убедитесь, что код не истек (10 минут)
- Проверьте, что вводите правильный email
- Попробуйте запросить новый код

### Ошибки базы данных
- Убедитесь, что миграция применена: `npx prisma migrate dev`
- Проверьте подключение к базе данных
