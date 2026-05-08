# Документ требований: Система верификации выполнения задач

## Введение

Система верификации выполнения задач предоставляет механизм подтверждения того, что волонтёры действительно выполнили назначенные им задачи. Верификация осуществляется через сканирование QR-кодов на месте выполнения задачи. Организаторы могут подтверждать или отклонять выполнение задач, а также оставлять отзывы и оценки.

## Глоссарий

- **Task_Verification_System**: Система верификации выполнения задач волонтёрами
- **Organizer**: Пользователь с ролью организатора, создающий проекты и задачи
- **Volunteer**: Пользователь с ролью волонтёра, выполняющий задачи
- **Task**: Задача в рамках проекта, которую необходимо выполнить
- **Task_Assignment**: Назначение задачи конкретному волонтёру
- **QR_Code**: Уникальный QR-код для верификации выполнения задачи
- **Verification_Status**: Статус верификации задачи (assigned, in_progress, completed, confirmed, rejected, cancelled)
- **QR_Code_Generator**: Компонент, генерирующий уникальные QR-коды
- **QR_Code_Scanner**: Компонент для сканирования QR-кодов
- **Notification_Service**: Сервис отправки уведомлений пользователям

## Требования

### Требование 1: Генерация QR-кодов

**User Story:** Как организатор, я хочу генерировать уникальные QR-коды для задач, чтобы волонтёры могли подтверждать выполнение на месте.

#### Критерии приёмки

1. THE QR_Code_Generator SHALL генерировать уникальный QR-код для задачи при её создании
2. THE QR_Code_Generator SHALL включать в QR-код идентификатор задачи, идентификатор проекта и криптографическую подпись
3. THE QR_Code_Generator SHALL использовать алгоритм HMAC-SHA256 для создания криптографической подписи
4. THE Task_Verification_System SHALL сохранять сгенерированный QR-код в базе данных
5. WHEN организатор просматривает задачу, THE Task_Verification_System SHALL отображать QR-код для скачивания или печати
6. THE QR_Code_Generator SHALL генерировать QR-код в формате PNG с разрешением минимум 300x300 пикселей

### Требование 2: Сканирование QR-кодов

**User Story:** Как волонтёр, я хочу сканировать QR-код на месте выполнения задачи, чтобы быстро подтвердить выполнение.

#### Критерии приёмки

1. WHEN Verification_Status равен "assigned" OR "in_progress", THE Task_Verification_System SHALL предоставить волонтёру интерфейс для сканирования QR-кода
2. WHEN волонтёр сканирует QR-код, THE QR_Code_Scanner SHALL извлечь данные из QR-кода
3. WHEN QR-код отсканирован, THE Task_Verification_System SHALL проверить криптографическую подпись
4. IF криптографическая подпись недействительна, THEN THE Task_Verification_System SHALL отклонить сканирование и отобразить сообщение об ошибке "Недействительный QR-код"
5. IF криптографическая подпись действительна AND задача назначена данному волонтёру, THEN THE Task_Verification_System SHALL изменить Verification_Status на "completed"
6. IF задача не назначена данному волонтёру, THEN THE Task_Verification_System SHALL отклонить сканирование и отобразить сообщение "Эта задача не назначена вам"
7. WHEN Verification_Status изменяется на "completed" после сканирования, THE Task_Verification_System SHALL записать текущую дату и время в поле completedAt
8. WHEN сканирование успешно завершено, THE Notification_Service SHALL отправить уведомление организатору

### Требование 3: Статус "В процессе"

**User Story:** Как волонтёр, я хочу отметить, что начал работу над задачей, чтобы организатор знал о моём прогрессе.

#### Критерии приёмки

1. WHEN Verification_Status равен "assigned", THE Task_Verification_System SHALL предоставить волонтёру кнопку "Начать работу"
2. WHEN волонтёр нажимает "Начать работу", THE Task_Verification_System SHALL изменить Verification_Status на "in_progress"
3. WHEN Verification_Status изменяется на "in_progress", THE Notification_Service SHALL отправить уведомление организатору
4. WHEN Verification_Status равен "in_progress", THE Task_Verification_System SHALL отображать время начала работы

### Требование 4: Просмотр информации о выполнении

**User Story:** Как организатор, я хочу просматривать информацию о выполнении задач, чтобы проверить статус работы.

#### Критерии приёмки

1. WHEN Verification_Status равен "completed", THE Task_Verification_System SHALL отобразить организатору уведомление о выполнении задачи
2. THE Task_Verification_System SHALL предоставить организатору интерфейс для просмотра информации о выполнении задачи
3. WHERE верификация выполнена через QR-код, THE Task_Verification_System SHALL отображать время и дату сканирования
4. THE Task_Verification_System SHALL отображать информацию о волонтёре, выполнившем задачу
5. THE Task_Verification_System SHALL отображать дату и время выполнения задачи

### Требование 5: Подтверждение выполнения задачи

**User Story:** Как организатор, я хочу подтверждать выполнение задачи, чтобы зафиксировать успешное завершение работы.

#### Критерии приёмки

1. WHEN Verification_Status равен "completed", THE Task_Verification_System SHALL предоставить организатору кнопку "Подтвердить"
2. WHEN организатор нажимает "Подтвердить", THE Task_Verification_System SHALL изменить Verification_Status на "confirmed"
3. WHEN Verification_Status изменяется на "confirmed", THE Task_Verification_System SHALL записать текущую дату и время в поле confirmedAt
4. WHEN Verification_Status изменяется на "confirmed", THE Notification_Service SHALL отправить уведомление волонтёру
5. WHEN задача подтверждена, THE Task_Verification_System SHALL увеличить счётчик выполненных задач волонтёра
6. WHERE все Task_Assignment для задачи имеют статус "confirmed" OR "cancelled", THE Task_Verification_System SHALL изменить статус самой задачи на "completed"

### Требование 6: Отклонение выполнения задачи

**User Story:** Как организатор, я хочу отклонять выполнение задачи с указанием причины, чтобы волонтёр знал о проблемах.

#### Критерии приёмки

1. WHEN Verification_Status равен "completed", THE Task_Verification_System SHALL предоставить организатору кнопку "Отклонить"
2. WHEN организатор нажимает "Отклонить", THE Task_Verification_System SHALL отобразить форму для ввода причины отклонения
3. THE Task_Verification_System SHALL требовать ввода причины отклонения длиной от 10 до 500 символов
4. WHEN организатор отправляет причину отклонения, THE Task_Verification_System SHALL изменить Verification_Status на "rejected"
5. WHEN Verification_Status изменяется на "rejected", THE Task_Verification_System SHALL сохранить причину отклонения в базе данных
6. WHEN Verification_Status изменяется на "rejected", THE Notification_Service SHALL отправить уведомление волонтёру с причиной отклонения
7. WHEN задача отклонена, THE Task_Verification_System SHALL позволить волонтёру отсканировать QR-код повторно

### Требование 7: Оценка и отзыв

**User Story:** Как организатор, я хочу оставлять оценку и отзыв о работе волонтёра, чтобы мотивировать качественное выполнение задач.

#### Критерии приёмки

1. WHEN Verification_Status равен "confirmed", THE Task_Verification_System SHALL предоставить организатору интерфейс для оставления оценки и отзыва
2. THE Task_Verification_System SHALL позволить организатору выбрать оценку от 1 до 5 звёзд
3. THE Task_Verification_System SHALL позволить организатору ввести текстовый отзыв длиной до 1000 символов
4. THE Task_Verification_System SHALL позволить организатору оставить оценку без отзыва
5. THE Task_Verification_System SHALL позволить организатору оставить отзыв без оценки
6. WHEN организатор сохраняет оценку или отзыв, THE Task_Verification_System SHALL сохранить данные в базе данных
7. WHEN организатор сохраняет оценку или отзыв, THE Notification_Service SHALL отправить уведомление волонтёру
8. THE Task_Verification_System SHALL отображать оценку и отзыв в профиле волонтёра

### Требование 8: История выполнения задач волонтёра

**User Story:** Как волонтёр, я хочу видеть историю всех моих выполненных задач, чтобы отслеживать свою работу и получать обратную связь.

#### Критерии приёмки

1. THE Task_Verification_System SHALL предоставить волонтёру страницу с историей всех его задач
2. THE Task_Verification_System SHALL отображать для каждой задачи название, дату выполнения и текущий статус
3. THE Task_Verification_System SHALL позволить волонтёру фильтровать задачи по статусу (completed, confirmed, rejected)
4. THE Task_Verification_System SHALL позволить волонтёру сортировать задачи по дате выполнения
5. WHEN волонтёр выбирает задачу, THE Task_Verification_System SHALL отображать полную информацию: время сканирования, комментарии организатора, оценку и отзыв
6. WHERE задача отклонена, THE Task_Verification_System SHALL отображать причину отклонения

### Требование 9: Панель верификации организатора

**User Story:** Как организатор, я хочу видеть все выполненные задачи по моим проектам в одном месте, чтобы эффективно управлять проверкой.

#### Критерии приёмки

1. THE Task_Verification_System SHALL предоставить организатору панель со всеми выполненными задачами по его проектам
2. THE Task_Verification_System SHALL отображать количество задач, ожидающих проверки (статус "completed")
3. THE Task_Verification_System SHALL позволить организатору фильтровать задачи по проекту
4. THE Task_Verification_System SHALL позволить организатору фильтровать задачи по статусу
5. THE Task_Verification_System SHALL позволить организатору сортировать задачи по дате выполнения
6. THE Task_Verification_System SHALL отображать для каждой задачи имя волонтёра, название задачи, дату выполнения и статус
7. WHEN организатор выбирает задачу, THE Task_Verification_System SHALL отображать полную информацию для проверки

### Требование 10: Уведомления

**User Story:** Как пользователь, я хочу получать уведомления об изменении статуса задач, чтобы быть в курсе процесса верификации.

#### Критерии приёмки

1. WHEN волонтёр изменяет статус на "in_progress", THE Notification_Service SHALL отправить уведомление организатору в течение 30 секунд
2. WHEN волонтёр изменяет статус на "completed", THE Notification_Service SHALL отправить уведомление организатору в течение 30 секунд
3. WHEN организатор изменяет статус на "confirmed", THE Notification_Service SHALL отправить уведомление волонтёру в течение 30 секунд
4. WHEN организатор изменяет статус на "rejected", THE Notification_Service SHALL отправить уведомление волонтёру в течение 30 секунд с причиной отклонения
5. WHEN организатор оставляет оценку или отзыв, THE Notification_Service SHALL отправить уведомление волонтёру в течение 30 секунд
6. THE Task_Verification_System SHALL отображать уведомления в интерфейсе пользователя
7. THE Task_Verification_System SHALL отправлять email-уведомления, если пользователь включил эту опцию в настройках

### Требование 11: Безопасность QR-кодов

**User Story:** Как организатор, я хочу, чтобы QR-коды были защищены от подделки, чтобы предотвратить мошенничество.

#### Критерии приёмки

1. THE QR_Code_Generator SHALL использовать секретный ключ для генерации криптографической подписи
2. THE Task_Verification_System SHALL хранить секретный ключ в защищённом хранилище переменных окружения
3. THE Task_Verification_System SHALL включать в QR-код временную метку генерации
4. WHEN QR-код сканируется, THE Task_Verification_System SHALL проверять, что временная метка не старше 90 дней
5. IF временная метка старше 90 дней, THEN THE Task_Verification_System SHALL отклонить сканирование и отобразить сообщение "QR-код устарел"
6. THE Task_Verification_System SHALL логировать все попытки сканирования QR-кодов с недействительной подписью
7. IF обнаружено более 5 неудачных попыток сканирования от одного пользователя за 1 час, THEN THE Task_Verification_System SHALL временно заблокировать возможность сканирования для этого пользователя на 1 час

### Требование 12: Отмена назначения задачи

**User Story:** Как организатор или волонтёр, я хочу иметь возможность отменить назначение задачи, чтобы реагировать на изменение обстоятельств.

#### Критерии приёмки

1. WHEN Verification_Status равен "assigned" OR "in_progress", THE Task_Verification_System SHALL предоставить организатору кнопку "Отменить назначение"
2. WHEN Verification_Status равен "assigned" OR "in_progress", THE Task_Verification_System SHALL предоставить волонтёру кнопку "Отказаться от задачи"
3. WHEN организатор или волонтёр отменяет назначение, THE Task_Verification_System SHALL изменить Verification_Status на "cancelled"
4. WHEN Verification_Status изменяется на "cancelled", THE Notification_Service SHALL отправить уведомление другой стороне
5. WHEN назначение отменено, THE Task_Verification_System SHALL уменьшить счётчик currentVolunteers для задачи
6. WHEN назначение отменено волонтёром, THE Task_Verification_System SHALL позволить организатору назначить задачу другому волонтёру

### Требование 13: Повторное сканирование после отклонения

**User Story:** Как волонтёр, я хочу иметь возможность отсканировать QR-код повторно после отклонения, чтобы исправить ситуацию.

#### Критерии приёмки

1. WHEN Verification_Status равен "rejected", THE Task_Verification_System SHALL предоставить волонтёру интерфейс для повторного сканирования QR-кода
2. WHEN волонтёр сканирует QR-код после отклонения, THE Task_Verification_System SHALL изменить Verification_Status на "completed"
3. THE Task_Verification_System SHALL сохранять историю всех попыток верификации для одного назначения
4. THE Task_Verification_System SHALL отображать организатору все предыдущие попытки и причины отклонения
5. WHEN волонтёр сканирует QR-код повторно, THE Notification_Service SHALL отправить уведомление организатору

### Требование 14: Статистика верификации

**User Story:** Как организатор, я хочу видеть статистику по верификации задач, чтобы оценивать эффективность работы волонтёров.

#### Критерии приёмки

1. THE Task_Verification_System SHALL предоставить организатору страницу со статистикой по проекту
2. THE Task_Verification_System SHALL отображать общее количество назначенных, выполненных, подтверждённых и отклонённых задач
3. THE Task_Verification_System SHALL отображать среднее время от назначения до выполнения задачи
4. THE Task_Verification_System SHALL отображать среднее время от выполнения до подтверждения задачи
5. THE Task_Verification_System SHALL отображать процент подтверждённых задач от общего числа выполненных
6. THE Task_Verification_System SHALL отображать список волонтёров с наибольшим количеством подтверждённых задач
7. THE Task_Verification_System SHALL позволить организатору экспортировать статистику в формате CSV
