# Requirements Document: Phase 2 - Task Assignment System

## Introduction

Phase 2 расширяет систему управления волонтерами, добавляя функциональность для управления участниками проектов и назначения задач. После одобрения заявки (Application) волонтер становится участником проекта (ProjectParticipant), но задачи назначаются отдельно организатором. Эта фаза также включает управление жизненным циклом проекта через изменение статусов.

## Glossary

- **Organizer**: Пользователь с ролью organizer, создающий проекты и управляющий волонтерами
- **Volunteer**: Пользователь с ролью volunteer, участвующий в проектах
- **Admin**: Пользователь с ролью admin, имеющий полный доступ к системе
- **Project_Participant**: Волонтер, чья заявка одобрена и который является участником проекта
- **Task_Assignment**: Связь между задачей и волонтером, назначенная организатором
- **Project_Status**: Статус проекта (recruiting, upcoming, active, completed, cancelled)
- **Task_Assignment_Status**: Статус назначения задачи (assigned, completed, confirmed, rejected, cancelled)
- **API_Endpoint**: REST API маршрут для взаимодействия с системой
- **UI_Component**: React компонент пользовательского интерфейса

## Requirements

### Requirement 1: Просмотр участников проекта

**User Story:** Как организатор, я хочу видеть список всех участников моего проекта, чтобы управлять командой и назначать задачи.

#### Acceptance Criteria

1. THE System SHALL provide an API_Endpoint GET /api/organizer/projects/[id]/participants that returns all Project_Participants for the specified project
2. WHEN an Organizer requests participants list, THE System SHALL return participant data including volunteer information, join date, and current task assignments
3. WHEN an Organizer requests participants for a project they do not own, THE System SHALL return HTTP 403 Forbidden error
4. WHEN an Admin requests participants list, THE System SHALL return participants for any project
5. THE System SHALL include in response: volunteerId, volunteer name, volunteer email, joinedAt timestamp, isActive status, assigned tasks count, and notes field
6. WHEN a project has no participants, THE System SHALL return an empty array with HTTP 200 status
7. THE System SHALL order participants by joinedAt timestamp in ascending order (earliest first)

#### Correctness Properties

**Property 1.1 (Invariant):** Количество участников в ответе всегда равно количеству записей ProjectParticipant с isActive=true для данного проекта

**Property 1.2 (Authorization Invariant):** Для любого запроса от не-организатора и не-админа, система возвращает 401 или 403

**Property 1.3 (Data Consistency):** Для каждого участника в ответе, volunteerId существует в таблице User с role=volunteer

**Property 1.4 (Ordering Property):** Для любых двух последовательных участников в ответе, joinedAt первого <= joinedAt второго

### Requirement 2: Назначение задач участникам

**User Story:** Как организатор, я хочу назначать задачи конкретным участникам проекта, чтобы распределить работу между волонтерами.

#### Acceptance Criteria

1. THE System SHALL provide an API_Endpoint POST /api/organizer/projects/[projectId]/tasks/[taskId]/assign that creates a Task_Assignment
2. WHEN an Organizer assigns a task, THE System SHALL require volunteerId in request body
3. WHEN an Organizer assigns a task, THE System SHALL validate that the Volunteer is a Project_Participant with isActive=true
4. WHEN an Organizer assigns a task, THE System SHALL validate that the task belongs to the project
5. IF a Task_Assignment already exists for the same task and volunteer, THEN THE System SHALL return HTTP 400 Bad Request error with message "Task already assigned to this volunteer"
6. WHEN a task is successfully assigned, THE System SHALL create a Task_Assignment record with status=assigned and assignedBy set to organizer's userId
7. WHEN a task is successfully assigned, THE System SHALL increment task.currentVolunteers by 1
8. IF task.currentVolunteers >= task.requiredVolunteers after assignment, THEN THE System SHALL update task.status to in_progress
9. WHEN an Organizer assigns a task to a volunteer who is not a project participant, THE System SHALL return HTTP 400 Bad Request error
10. WHEN an Organizer assigns a task from a different project, THE System SHALL return HTTP 400 Bad Request error

#### Correctness Properties

**Property 2.1 (Idempotence):** Попытка назначить ту же задачу тому же волонтеру дважды не создает дубликатов и возвращает ошибку

**Property 2.2 (Invariant):** После успешного назначения, task.currentVolunteers = количество уникальных Task_Assignment записей для этой задачи

**Property 2.3 (State Transition):** Если task.currentVolunteers достигает task.requiredVolunteers, task.status переходит в in_progress

**Property 2.4 (Authorization Invariant):** Только организатор проекта или админ может создать Task_Assignment

**Property 2.5 (Referential Integrity):** Для любого Task_Assignment, volunteerId существует в ProjectParticipant для того же projectId

### Requirement 3: Отмена назначения задачи

**User Story:** Как организатор, я хочу отменять назначение задач, чтобы перераспределить работу при необходимости.

#### Acceptance Criteria

1. THE System SHALL provide an API_Endpoint DELETE /api/organizer/projects/[projectId]/tasks/[taskId]/assignments/[volunteerId] that cancels a Task_Assignment
2. WHEN an Organizer cancels an assignment, THE System SHALL update Task_Assignment status to cancelled
3. WHEN an assignment is cancelled, THE System SHALL decrement task.currentVolunteers by 1
4. WHEN an Organizer cancels an assignment for a task with status=completed or confirmed, THE System SHALL return HTTP 400 Bad Request error
5. WHEN an Organizer cancels a non-existent assignment, THE System SHALL return HTTP 404 Not Found error
6. THE System SHALL preserve the Task_Assignment record (soft delete via status change, not hard delete)

#### Correctness Properties

**Property 3.1 (Inverse Operation):** Назначение задачи с последующей отменой возвращает task.currentVolunteers к исходному значению

**Property 3.2 (State Protection):** Невозможно отменить назначение для задачи со статусом completed или confirmed

**Property 3.3 (Audit Trail):** Task_Assignment запись сохраняется после отмены (status=cancelled), не удаляется

### Requirement 4: Управление статусами проекта

**User Story:** Как организатор, я хочу изменять статус проекта, чтобы отражать текущий этап его выполнения.

#### Acceptance Criteria

1. THE System SHALL provide an API_Endpoint PATCH /api/organizer/projects/[id]/status that updates Project_Status
2. WHEN an Organizer changes status, THE System SHALL require newStatus in request body
3. THE System SHALL allow status transitions: recruiting → upcoming, upcoming → active, active → completed, active → cancelled
4. WHEN an Organizer attempts an invalid status transition, THE System SHALL return HTTP 400 Bad Request error with allowed transitions
5. WHEN an Organizer changes status from recruiting to upcoming, THE System SHALL validate that project has at least 1 Project_Participant with isActive=true
6. WHEN an Organizer changes status from upcoming to active, THE System SHALL validate that project.startDate <= current date
7. WHEN an Organizer changes status to completed, THE System SHALL validate that all tasks have status=completed or cancelled
8. THE System SHALL record status change timestamp in project.updatedAt
9. WHEN a project status is cancelled, THE System SHALL update all pending Task_Assignments to cancelled status

#### Correctness Properties

**Property 4.1 (State Machine):** Все переходы статусов следуют определенному графу: recruiting → upcoming → active → (completed | cancelled)

**Property 4.2 (Precondition Validation):** Переход recruiting → upcoming возможен только если существует хотя бы 1 активный участник

**Property 4.3 (Precondition Validation):** Переход upcoming → active возможен только если startDate <= текущая дата

**Property 4.4 (Cascade Effect):** Изменение статуса проекта на cancelled каскадно обновляет все pending Task_Assignments на cancelled

**Property 4.5 (Completion Invariant):** Проект может перейти в completed только если все задачи завершены или отменены

### Requirement 5: UI для просмотра участников

**User Story:** Как организатор, я хочу видеть участников проекта в удобном интерфейсе, чтобы быстро оценить состав команды.

#### Acceptance Criteria

1. THE System SHALL provide a UI_Component ParticipantsListView that displays all Project_Participants
2. WHEN an Organizer opens the participants view, THE UI_Component SHALL fetch data from GET /api/organizer/projects/[id]/participants
3. THE UI_Component SHALL display for each participant: avatar, full name, email, join date, number of assigned tasks
4. THE UI_Component SHALL show loading state while fetching data
5. WHEN the API returns an error, THE UI_Component SHALL display an error message
6. WHEN a project has no participants, THE UI_Component SHALL display "No participants yet" message
7. THE UI_Component SHALL be responsive and work on mobile devices (min-width: 320px)

#### Correctness Properties

**Property 5.1 (UI-API Consistency):** Количество отображаемых участников соответствует количеству в API ответе

**Property 5.2 (Error Handling):** При любой ошибке API, UI отображает сообщение об ошибке, а не пустой экран

### Requirement 6: UI для назначения задач

**User Story:** Как организатор, я хочу назначать задачи участникам через интерфейс, чтобы не использовать API напрямую.

#### Acceptance Criteria

1. THE System SHALL provide a UI_Component TaskAssignmentModal that allows task assignment
2. WHEN an Organizer clicks "Assign Task" button, THE UI_Component SHALL open a modal with list of available participants
3. THE UI_Component SHALL display only participants who are not already assigned to the selected task
4. WHEN an Organizer selects a participant and confirms, THE UI_Component SHALL call POST /api/organizer/projects/[projectId]/tasks/[taskId]/assign
5. WHEN the assignment succeeds, THE UI_Component SHALL close the modal and refresh the participants list
6. WHEN the assignment fails, THE UI_Component SHALL display the error message from API response
7. THE UI_Component SHALL disable the submit button while the request is in progress
8. THE UI_Component SHALL show task details (title, description, required skills) in the modal

#### Correctness Properties

**Property 6.1 (Filtering Correctness):** Список доступных участников не содержит волонтеров, уже назначенных на эту задачу

**Property 6.2 (Optimistic UI):** После успешного назначения, UI обновляется и отражает новое состояние

### Requirement 7: Отображение назначенных задач

**User Story:** Как организатор, я хочу видеть, какие задачи назначены каждому участнику, чтобы контролировать распределение работы.

#### Acceptance Criteria

1. THE System SHALL extend ParticipantsListView to show assigned tasks for each participant
2. WHEN an Organizer expands a participant row, THE UI_Component SHALL display list of assigned tasks
3. THE UI_Component SHALL show for each task: title, status, deadline, assigned date
4. THE UI_Component SHALL provide "Unassign" button for each task with status=assigned
5. WHEN an Organizer clicks "Unassign", THE UI_Component SHALL call DELETE endpoint and update UI on success
6. THE UI_Component SHALL use color coding for task statuses (assigned: blue, in_progress: yellow, completed: green, cancelled: gray)

#### Correctness Properties

**Property 7.1 (Data Consistency):** Количество отображаемых задач для участника соответствует количеству Task_Assignment записей с этим volunteerId

**Property 7.2 (Status Visualization):** Каждый статус задачи имеет уникальный визуальный индикатор

### Requirement 8: Валидация прав доступа

**User Story:** Как система, я должна проверять права доступа, чтобы только авторизованные пользователи могли управлять проектами.

#### Acceptance Criteria

1. THE System SHALL validate authentication for all API_Endpoints in this feature
2. WHEN a request has no valid session, THE System SHALL return HTTP 401 Unauthorized error
3. WHEN a Volunteer attempts to access organizer endpoints, THE System SHALL return HTTP 403 Forbidden error
4. WHEN an Organizer attempts to access another organizer's project, THE System SHALL return HTTP 403 Forbidden error
5. WHEN an Admin accesses any endpoint, THE System SHALL allow the operation regardless of project ownership
6. THE System SHALL validate session on every request (no caching of authorization decisions)

#### Correctness Properties

**Property 8.1 (Authorization Invariant):** Для любого endpoint, запрос без валидной сессии возвращает 401

**Property 8.2 (Role-Based Access):** Волонтер никогда не может выполнить операции организатора (assign, unassign, change status)

**Property 8.3 (Ownership Validation):** Организатор может управлять только своими проектами (кроме админа)

**Property 8.4 (Admin Override):** Админ имеет доступ ко всем операциям независимо от ownership

### Requirement 9: Парсинг и валидация входных данных

**User Story:** Как система, я должна валидировать все входные данные, чтобы предотвратить некорректные операции.

#### Acceptance Criteria

1. THE Input_Validator SHALL parse and validate all request bodies for API_Endpoints
2. WHEN a request contains invalid JSON, THE System SHALL return HTTP 400 Bad Request error
3. WHEN a required field is missing, THE System SHALL return HTTP 400 Bad Request error with field name
4. WHEN a UUID field contains invalid format, THE System SHALL return HTTP 400 Bad Request error
5. WHEN a status field contains invalid value, THE System SHALL return HTTP 400 Bad Request error with allowed values
6. THE Input_Validator SHALL sanitize string inputs to prevent XSS attacks
7. THE System SHALL validate that numeric fields (if any) are within acceptable ranges

#### Correctness Properties

**Property 9.1 (Input Rejection):** Любой запрос с невалидным JSON отклоняется до выполнения бизнес-логики

**Property 9.2 (Required Fields):** Запрос без обязательного поля всегда возвращает 400 с указанием поля

**Property 9.3 (Type Safety):** UUID поля принимают только валидные UUID v4 строки

**Property 9.4 (Enum Validation):** Поля со статусами принимают только значения из определенного enum

### Requirement 10: Обработка ошибок и граничных случаев

**User Story:** Как система, я должна корректно обрабатывать ошибки, чтобы предоставлять понятные сообщения пользователям.

#### Acceptance Criteria

1. WHEN a database operation fails, THE System SHALL return HTTP 500 Internal Server Error
2. WHEN a resource is not found, THE System SHALL return HTTP 404 Not Found with descriptive message
3. WHEN a business rule is violated, THE System SHALL return HTTP 400 Bad Request with explanation
4. THE System SHALL log all errors to console with timestamp and request context
5. THE System SHALL not expose sensitive information (database schema, stack traces) in error responses
6. WHEN concurrent requests modify the same resource, THE System SHALL handle race conditions using database transactions
7. THE System SHALL return consistent error response format: { error: string, details?: object }

#### Correctness Properties

**Property 10.1 (Error Response Format):** Все ошибки возвращаются в формате { error: string }

**Property 10.2 (No Information Leakage):** Ошибки не содержат stack traces или database details в production

**Property 10.3 (Transaction Safety):** Конкурентные запросы на изменение одного ресурса не приводят к inconsistent state

**Property 10.4 (Idempotent Error Handling):** Повторный запрос после ошибки не создает побочных эффектов

## Implementation Notes

### API Endpoints Summary

1. `GET /api/organizer/projects/[id]/participants` - Получить список участников
2. `POST /api/organizer/projects/[projectId]/tasks/[taskId]/assign` - Назначить задачу
3. `DELETE /api/organizer/projects/[projectId]/tasks/[taskId]/assignments/[volunteerId]` - Отменить назначение
4. `PATCH /api/organizer/projects/[id]/status` - Изменить статус проекта

### UI Components Summary

1. `ParticipantsListView` - Список участников проекта
2. `TaskAssignmentModal` - Модальное окно для назначения задач
3. `ParticipantTasksList` - Список задач участника (expandable)

### Database Operations

- Все операции изменения данных должны использовать транзакции Prisma
- Используйте `include` для загрузки связанных данных (volunteer, task)
- Индексы уже существуют на составных ключах (projectId, volunteerId)

### Security Considerations

- Все endpoints требуют аутентификации через `getSession()`
- Проверка роли пользователя на каждом запросе
- Валидация ownership проекта для организаторов
- Админ имеет полный доступ (bypass ownership checks)

### Testing Strategy

- Unit тесты для валидации бизнес-логики
- Integration тесты для API endpoints
- Property-based тесты для проверки инвариантов (см. Correctness Properties)
- E2E тесты для критических user flows (assign task, change status)
