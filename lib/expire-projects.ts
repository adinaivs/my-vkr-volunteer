import { prisma } from '@/lib/prisma';
import { NotificationType } from '@prisma/client';
import { penalizeOverdueAssignments } from '@/lib/overdue-penalty';

export interface SweepResult {
  scanned: number;       // сколько просроченных проектов найдено
  completed: number;     // сколько переведено в "completed"
  overdueTasks: number;  // сколько задач помечено как просроченные
  notifications: number; // сколько уведомлений создано
}

/**
 * Находит проекты, у которых истёк срок (endDate < сегодня) и которые ещё
 * не в финальном статусе, и:
 *   1) помечает невыполненные задачи как overdue, отменяет назначения волонтёров;
 *   2) переводит проект в статус "completed";
 *   3) уведомляет организатора об окончании срока;
 *   4) уведомляет волонтёров о просроченных заданиях.
 */
export async function expireProjects(): Promise<SweepResult> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expired = await prisma.project.findMany({
    where: {
      endDate: { lt: today },
      status: { in: ['recruiting', 'upcoming', 'active'] },
    },
    select: {
      id: true,
      title: true,
      organizerId: true,
      tasks: {
        where: { status: { in: ['pending', 'in_progress'] } },
        select: {
          id: true,
          title: true,
          assignments: {
            where: { status: 'assigned' },
            select: { volunteerId: true },
          },
        },
      },
    },
  });

  let completed = 0;
  let overdueTaskCount = 0;
  const notifications: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    link: string;
  }[] = [];

  for (const project of expired) {
    const overdueTaskIds = project.tasks.map((t) => t.id);

    // Волонтёры с незакрытыми назначениями -> список названий их задач
    const affectedVolunteers = new Map<string, string[]>();
    for (const task of project.tasks) {
      for (const a of task.assignments) {
        const titles = affectedVolunteers.get(a.volunteerId) || [];
        titles.push(task.title);
        affectedVolunteers.set(a.volunteerId, titles);
      }
    }

    await prisma.$transaction(async (tx) => {
      if (overdueTaskIds.length > 0) {
        await tx.task.updateMany({
          where: { id: { in: overdueTaskIds } },
          data: { status: 'overdue' },
        });
        // Отменяем назначения, ставим 0 звёзд и пересчитываем рейтинг волонтёров
        await penalizeOverdueAssignments(tx, overdueTaskIds);
      }
      await tx.project.update({
        where: { id: project.id },
        data: { status: 'completed' },
      });
    });

    completed++;
    overdueTaskCount += overdueTaskIds.length;

    // Уведомление организатору
    notifications.push({
      userId: project.organizerId,
      type: 'project_overdue',
      title: 'Срок проекта истёк',
      body:
        overdueTaskIds.length > 0
          ? `Проект «${project.title}» завершён по истечении срока. Не выполнено задач: ${overdueTaskIds.length}.`
          : `Проект «${project.title}» завершён по истечении срока.`,
      link: `/organizer/projects/${project.id}`,
    });

    // Уведомления волонтёрам, не успевшим выполнить задания
    for (const [volunteerId, titles] of affectedVolunteers) {
      notifications.push({
        userId: volunteerId,
        type: 'project_overdue',
        title: 'Задание просрочено',
        body: `Срок проекта «${project.title}» истёк. Невыполненные задания (${titles.length}) отмечены как просроченные.`,
        link: `/volunteer/my-projects/${project.id}`,
      });
    }
  }

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications, skipDuplicates: true });
  }

  return {
    scanned: expired.length,
    completed,
    overdueTasks: overdueTaskCount,
    notifications: notifications.length,
  };
}

// --- Ленивая (throttled) обёртка для вызова из обычных запросов ---
let lastRun = 0;
const THROTTLE_MS = 5 * 60 * 1000; // не чаще раза в 5 минут на инстанс

/**
 * Безопасный для основного флоу запуск проверки сроков: выполняется не чаще
 * раза в THROTTLE_MS, ошибки не пробрасываются.
 */
export async function expireProjectsThrottled(): Promise<void> {
  if (Date.now() - lastRun < THROTTLE_MS) return;
  lastRun = Date.now(); // ставим сразу, чтобы избежать гонок
  try {
    await expireProjects();
  } catch (error) {
    console.error('expireProjectsThrottled failed:', error);
  }
}
