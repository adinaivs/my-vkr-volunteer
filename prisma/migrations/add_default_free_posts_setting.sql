-- Добавляем настройку количества бесплатных публикаций по умолчанию
INSERT INTO settings (id, key, value)
VALUES (gen_random_uuid(), 'default_free_posts', '3')
ON CONFLICT (key) DO NOTHING;
