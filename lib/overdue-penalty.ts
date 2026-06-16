import { Prisma, PrismaClient } from '@prisma/client';

type Client = PrismaClient | Prisma.TransactionClient;

export const OVERDUE_PENALTY_FEEDBACK = 'Задание не выполнено в установленный срок';

/**
 * Штраф за невыполненные в срок задания.
 * Для всех ещё открытых назначений (status = assigned) по просроченным задачам:
 *   - отменяет назначение (status = cancelled);
 *   - ставит оценку 0 звёзд с пояснением;
 *   - пересчитывает средний рейтинг волонтёра (trustScore), добавляя 0 в среднее.
 *
 * Можно вызывать как с обычным prisma-клиентом, так и внутри транзакции.
 * Возвращает количество оштрафованных назначений.
 */
export async function penalizeOverdueAssignments(
  client: Client,
  overdueTaskIds: string[]
): Promise<number> {
  if (overdueTaskIds.length === 0) return 0;

  const assignments = await client.taskAssignment.findMany({
    where: { taskId: { in: overdueTaskIds }, status: 'assigned' },
    select: { id: true, volunteerId: true },
  });
  if (assignments.length === 0) return 0;

  // Отменяем назначения и выставляем 0 звёзд
  await client.taskAssignment.updateMany({
    where: { id: { in: assignments.map((a) => a.id) } },
    data: { status: 'cancelled', rating: 0, feedback: OVERDUE_PENALTY_FEEDBACK },
  });

  // Сколько заданий пропустил каждый волонтёр
  const missedPerVolunteer = new Map<string, number>();
  for (const a of assignments) {
    missedPerVolunteer.set(a.volunteerId, (missedPerVolunteer.get(a.volunteerId) || 0) + 1);
  }

  // Пересчитываем рейтинг: добавляем k нулей в среднее
  for (const [volunteerId, k] of missedPerVolunteer) {
    const profile = await client.volunteerProfile.findUnique({
      where: { userId: volunteerId },
      select: { trustScore: true, ratingCount: true },
    });
    if (!profile) continue;

    const oldScore = Number(profile.trustScore ?? 0);
    const oldCount = profile.ratingCount ?? 0;
    const newCount = oldCount + k;
    const newScore = newCount > 0 ? (oldScore * oldCount) / newCount : 0;

    await client.volunteerProfile.update({
      where: { userId: volunteerId },
      data: { trustScore: newScore, ratingCount: newCount },
    });
  }

  return assignments.length;
}
