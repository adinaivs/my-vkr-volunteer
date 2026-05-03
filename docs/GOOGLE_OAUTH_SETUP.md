# Настройка Google OAuth

## Проблема: redirect_uri_mismatch

Если вы видите ошибку `Error 400: redirect_uri_mismatch`, это означает, что redirect URI в Google Cloud Console не совпадает с тем, что использует приложение.

## Решение

### Шаг 1: Откройте Google Cloud Console
Перейдите на: https://console.cloud.google.com/

### Шаг 2: Выберите проект
Убедитесь, что выбран правильный проект (где создан OAuth Client)

### Шаг 3: Перейдите в Credentials
1. В левом меню выберите **"APIs & Services"**
2. Нажмите **"Credentials"**

### Шаг 4: Найдите OAuth 2.0 Client ID
Найдите в списке ваш Client ID

### Шаг 5: Редактируйте настройки
1. Нажмите на имя Client ID для редактирования
2. Прокрутите до раздела **"Authorized redirect URIs"**

### Шаг 6: Добавьте redirect URI

**Для разработки (localhost):**
```
http://localhost:3000/api/auth/google/callback
```

**Для продакшена:**
```
https://ваш-домен.com/api/auth/google/callback
```

**ВАЖНО:** URI должен быть точным, включая:
- Протокол: `http://` для localhost, `https://` для продакшена
- Хост: `localhost:3000` или ваш домен
- Путь: `/api/auth/google/callback`

### Шаг 7: Сохраните
Нажмите кнопку **"SAVE"** внизу страницы

### Шаг 8: Настройте переменные окружения

Создайте файл `.env` в корне проекта:

```env
NEXT_PUBLIC_APP_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="ваш-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="ваш-client-secret"
```

**ВАЖНО:** Никогда не коммитьте файл `.env` в Git!

## Проверка

После настройки:
1. Перейдите на http://localhost:3000/register/volunteer
2. Нажмите "Войти через Google"
3. Должно открыться окно выбора аккаунта Google

## Частые ошибки

❌ **Неправильно:**
- `http://localhost:3000/api/auth/google/callback/` (лишний слеш в конце)
- `https://localhost:3000/api/auth/google/callback` (https вместо http для localhost)
- `http://127.0.0.1:3000/api/auth/google/callback` (127.0.0.1 вместо localhost)

✅ **Правильно:**
- `http://localhost:3000/api/auth/google/callback`

## Создание нового OAuth Client

Если у вас нет OAuth Client:

1. Откройте Google Cloud Console
2. Создайте новый проект или выберите существующий
3. Включите Google+ API
4. Перейдите в "APIs & Services" → "Credentials"
5. Нажмите "Create Credentials" → "OAuth client ID"
6. Выберите "Web application"
7. Добавьте Authorized redirect URIs
8. Скопируйте Client ID и Client Secret в `.env`
