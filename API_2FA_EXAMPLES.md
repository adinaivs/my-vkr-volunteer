# Примеры использования API двухфакторной аутентификации

## 1. Регистрация волонтера

### Шаг 1: Отправка данных регистрации
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "volunteer@example.com",
  "phone": "+996555123456",
  "password": "securePassword123",
  "firstName": "Иван",
  "lastName": "Иванов",
  "city": "Бишкек",
  "role": "volunteer"
}
```

**Ответ (200 OK):**
```json
{
  "message": "Код подтверждения отправлен на email",
  "email": "volunteer@example.com"
}
```

### Шаг 2: Подтверждение email кодом
```bash
POST /api/auth/verify-email
Content-Type: application/json

{
  "email": "volunteer@example.com",
  "code": "123456"
}
```

**Ответ (201 Created):**
```json
{
  "user": {
    "id": "uuid",
    "email": "volunteer@example.com",
    "firstName": "Иван",
    "lastName": "Иванов",
    "role": "volunteer"
  }
}
```

## 2. Регистрация организатора

### Шаг 1: Отправка данных регистрации
```bash
POST /api/auth/register/organizer
Content-Type: application/json

{
  "email": "org@example.com",
  "phone": "+996555123456",
  "password": "securePassword123",
  "firstName": "Петр",
  "lastName": "Петров",
  "organizationName": "ОсОО Пример",
  "inn": "12345678901234",
  "okpo": "12345678",
  "verificationDocUrl": null
}
```

**Ответ (200 OK):**
```json
{
  "message": "Код подтверждения отправлен на email",
  "email": "org@example.com"
}
```

### Шаг 2: Подтверждение email кодом
```bash
POST /api/auth/verify-email
Content-Type: application/json

{
  "email": "org@example.com",
  "code": "654321"
}
```

**Ответ (201 Created):**
```json
{
  "user": {
    "id": "uuid",
    "email": "org@example.com",
    "firstName": "Петр",
    "lastName": "Петров",
    "role": "organizer"
  }
}
```

## 3. Восстановление пароля

### Шаг 1: Запрос кода восстановления
```bash
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "volunteer@example.com"
}
```

**Ответ (200 OK):**
```json
{
  "message": "Код восстановления отправлен на email"
}
```

### Шаг 2: Проверка кода (опционально)
```bash
POST /api/auth/verify-reset-code
Content-Type: application/json

{
  "email": "volunteer@example.com",
  "code": "789012"
}
```

**Ответ (200 OK):**
```json
{
  "message": "Код подтвержден",
  "valid": true
}
```

### Шаг 3: Установка нового пароля
```bash
POST /api/auth/reset-password
Content-Type: application/json

{
  "email": "volunteer@example.com",
  "code": "789012",
  "newPassword": "newSecurePassword456"
}
```

**Ответ (200 OK):**
```json
{
  "message": "Пароль успешно изменен"
}
```

## 4. Вход в систему (без изменений)

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "volunteer@example.com",
  "password": "newSecurePassword456"
}
```

**Ответ (200 OK):**
```json
{
  "user": {
    "id": "uuid",
    "email": "volunteer@example.com",
    "firstName": "Иван",
    "lastName": "Иванов",
    "role": "volunteer"
  }
}
```

## Коды ошибок

### 400 Bad Request
- Отсутствуют обязательные поля
- Неверный формат данных
- Пароли не совпадают
- Код истек
- Неверный код

### 401 Unauthorized
- Неверный email или пароль (при входе)

### 404 Not Found
- Токен верификации не найден
- Пользователь не найден

### 500 Internal Server Error
- Ошибка при отправке email
- Ошибка базы данных
- Другие серверные ошибки

## Примеры ошибок

### Неверный код
```json
{
  "error": "Неверный код"
}
```

### Код истек
```json
{
  "error": "Код истек. Пожалуйста, зарегистрируйтесь снова"
}
```

### Пользователь уже существует
```json
{
  "error": "Пользователь с таким email или телефоном уже существует"
}
```

## Тестирование с curl

### Регистрация
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "phone": "+996555123456",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User",
    "city": "Bishkek",
    "role": "volunteer"
  }'
```

### Подтверждение кода
```bash
curl -X POST http://localhost:3000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456"
  }'
```

### Восстановление пароля
```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

### Сброс пароля
```bash
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456",
    "newPassword": "newPassword123"
  }'
```
