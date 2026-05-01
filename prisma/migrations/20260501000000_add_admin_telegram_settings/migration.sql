-- Добавляем настройки Telegram для админа
INSERT INTO "settings" ("id", "key", "value") 
VALUES 
  (gen_random_uuid(), 'ADMIN_TELEGRAM_BOT_TOKEN', 'YOUR_BOT_TOKEN_HERE'),
  (gen_random_uuid(), 'ADMIN_TELEGRAM_USER_ID', 'YOUR_TELEGRAM_USER_ID_HERE')
ON CONFLICT ("key") DO NOTHING;
