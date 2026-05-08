# ✅ Phase 1 - Чек-лист проверки

## 🎯 Что было сделано в Phase 1

### 1. Обновлен enum ProjectStatus
- ✅ Добавлены новые статусы: `recruiting`, `upcoming`, `active`, `cancelled`
- ✅ Удален старый статус: `published` (заменен на `recruiting`)

### 2. Создана модель ProjectParticipant
- ✅ Таблица `project_participants` для отслеживания участников проекта
- ✅ Поля: projectId, volunteerId, joinedAt, leftAt, isActive, notes
- ✅ Unique constraint: `[projectId, volunteerId]`

### 3. Обновлена логика Application approval
- ✅ При approve заявки создается `ProjectParticipant` (НЕ TaskAssignment)
- ✅ Добавлены валидации:
  - Проверка статуса проекта (должен быть `recruiting`)
  - Проверка лимита волонтеров
  - Проверка дубликатов участников

### 4. Добавлены unique constraints
- ✅ `[projectId, volunteerId]` для applications
- ✅ `[taskId, volunteerId]` для task_assignments

### 5. Созданы таблицы переводов
- ✅ `skill_translations` (id, skill_id, locale, name)
- ✅ `category_translations` (id, category_id, locale, name)
- ✅ `achievement_translations` (id, achievement_id, locale, name, description)
- ✅ Enum `Language { ru, kg }`
- ✅ Unique constraint: `[entityId, locale]`

---

## 🧪 Автоматическая проверка

### Запустить тест:
```bash
node test-phase1.js
```

**Результат:** ✅ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ

---

## 🖱️ Ручная проверка через UI

### Шаг 1: Запустить dev-сервер
```bash
npm run dev
```

### Шаг 2: Проверка workflow заявок

#### 2.1 Создание проекта организатором
1. Войти как организатор
2. Создать новый проект
3. **Проверить:** После одобрения админом проект должен быть в статусе `recruiting` (не `published`)

#### 2.2 Подача заявки волонтером
1. Войти как волонтер
2. Найти проект в статусе `recruiting`
3. Подать заявку
4. **Проверить:** Кнопка должна измениться на "⏳ Ожидание ответа"

#### 2.3 Одобрение заявки организатором
1. Войти как организатор
2. Перейти в раздел "Заявки" (`/organizer/applications`)
3. Одобрить заявку волонтера
4. **Проверить в базе данных:**
   ```sql
   -- Должна быть запись в project_participants
   SELECT * FROM project_participants WHERE project_id = 'PROJECT_ID';
   
   -- НЕ должно быть записи в task_assignments
   SELECT * FROM task_assignments WHERE volunteer_id = 'VOLUNTEER_ID';
   ```

#### 2.4 Проверка валидаций
1. Попробовать одобрить заявку для проекта НЕ в статусе `recruiting`
   - **Ожидается:** Ошибка "Можно обрабатывать заявки только для проектов в статусе 'Набор волонтеров'"

2. Попробовать одобрить заявку, когда достигнут лимит волонтеров
   - **Ожидается:** Ошибка "Достигнуто максимальное количество волонтеров"

3. Попробовать одобрить заявку от волонтера, который уже участник
   - **Ожидается:** Ошибка "Волонтер уже является участником проекта"

---

## 📊 Проверка в базе данных

### Проверить структуру таблиц:
```sql
-- 1. Таблица project_participants
\d project_participants

-- 2. Enum ProjectStatus
SELECT unnest(enum_range(NULL::\"ProjectStatus\"));

-- 3. Таблицы переводов
\d skill_translations
\d category_translations
\d achievement_translations

-- 4. Enum Language
SELECT unnest(enum_range(NULL::\"Language\"));
```

### Проверить constraints:
```sql
-- Unique constraints
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid IN (
  'applications'::regclass,
  'task_assignments'::regclass,
  'project_participants'::regclass
);
```

---

## 🔍 Проверка обновленных API endpoints

### 1. POST /api/projects/[id]/apply
- **Проверить:** Можно подать заявку только на проект в статусе `recruiting`

### 2. GET /api/projects/[id]/apply
- **Проверить:** Возвращает статус заявки (pending/approved/rejected)

### 3. PUT /api/organizer/applications/[id]
- **Проверить:** 
  - При approve создается ProjectParticipant
  - НЕ создается TaskAssignment
  - Работают все валидации

### 4. GET /api/admin/statistics
- **Проверить:** Использует статус `recruiting` вместо `published`

### 5. GET /api/admin/projects
- **Проверить:** Фильтрация по статусу `recruiting` работает

### 6. PUT /api/admin/projects/[id]/approve
- **Проверить:** Проект переходит в статус `recruiting` (не `published`)

---

## ✅ Критерии успешного завершения Phase 1

- [x] Prisma Client сгенерирован без ошибок
- [x] Все миграции применены (`npx prisma migrate status` показывает "up to date")
- [x] Автоматический тест `test-phase1.js` проходит успешно
- [x] Модель ProjectParticipant доступна в коде
- [x] Enum ProjectStatus содержит новые значения
- [x] Таблицы переводов созданы
- [ ] **Ручная проверка:** Workflow заявок работает корректно (Application → ProjectParticipant)
- [ ] **Ручная проверка:** Валидации работают
- [ ] **Ручная проверка:** API endpoints используют новые статусы

---

## 🚀 Готовность к Phase 2

После успешной проверки всех пунктов можно переходить к **Phase 2**:

### Phase 2 будет включать:
1. **Endpoint для просмотра участников проекта**
   - GET /api/organizer/projects/[id]/participants
   
2. **Endpoint для назначения задач участникам**
   - POST /api/organizer/projects/[id]/tasks/[taskId]/assign
   - Валидация: только участники проекта (ProjectParticipant)
   - Валидация: не превышать requiredVolunteers
   
3. **Endpoint для управления статусами проекта**
   - PUT /api/organizer/projects/[id]/status
   - Transitions: recruiting → upcoming → active → completed
   
4. **UI для назначения задач**
   - Страница с списком участников проекта
   - Интерфейс для распределения по задачам

---

## 📝 Примечания

- База данных была сброшена (reset) во время создания миграций
- Все старые данные удалены
- Если нужны тестовые данные, создайте их через UI или seed скрипт
