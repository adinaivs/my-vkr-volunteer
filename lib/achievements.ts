import { prisma } from '@/lib/prisma';

// Выдаёт достижение пользователю, если оно ещё не выдано и условие выполнено
async function grantAchievementIfNeeded(
  userId: string,
  conditionType: string,
  conditionValue: number,
  extraCheck?: () => Promise<boolean>
) {
  const achievement = await prisma.achievement.findFirst({
    where: { conditionType: conditionType as any, conditionValue, isActive: true },
    include: { rewards: { where: { isActive: true }, take: 1 } },
  });
  if (!achievement) return;

  const already = await prisma.userAchievement.findFirst({
    where: { userId, achievementId: achievement.id },
  });
  if (already) return;

  if (extraCheck && !(await extraCheck())) return;

  const rewardText = achievement.rewards[0]?.rewardText || achievement.name;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (achievement.rewards[0]?.validForDays || 365));

  await prisma.userAchievement.create({
    data: { userId, achievementId: achievement.id, rewardText, expiresAt },
  });
}

// Вызывается когда заявка волонтёра на проект одобрена
export async function checkAchievementsOnApplicationApproved(
  volunteerId: string,
  projectId: string
) {
  try {
    // Считаем общее количество проектов волонтёра
    const totalProjects = await prisma.projectParticipant.count({
      where: { volunteerId },
    });

    // projects_count — Новичок (1), Активист (5)
    for (const threshold of [1, 5, 10]) {
      if (totalProjects >= threshold) {
        await grantAchievementIfNeeded(volunteerId, 'projects_count', threshold);
      }
    }

    // category_projects_count — Эксперт (10 проектов в одной категории)
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { categoryId: true },
    });

    if (project?.categoryId) {
      const categoryCount = await prisma.projectParticipant.count({
        where: {
          volunteerId,
          project: { categoryId: project.categoryId },
        },
      });

      for (const threshold of [5, 10]) {
        if (categoryCount >= threshold) {
          await grantAchievementIfNeeded(volunteerId, 'category_projects_count', threshold);
        }
      }
    }
  } catch (err) {
    console.error('[achievements] checkAchievementsOnApplicationApproved error:', err);
  }
}

// Вызывается когда выполнение задачи подтверждено организатором
export async function checkAchievementsOnTaskConfirmed(volunteerId: string) {
  try {
    // perfect_month — все задачи за текущий месяц выполнены без просрочек
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthAssignments = await prisma.taskAssignment.findMany({
      where: {
        volunteerId,
        createdAt: { gte: monthStart },
      },
      include: { task: true },
    });

    if (monthAssignments.length >= 3) {
      const allConfirmedInTime = monthAssignments.every((a) => {
        if (a.status !== 'confirmed' || !a.confirmedAt) return false;
        return new Date(a.confirmedAt) <= new Date(a.task.deadline);
      });

      if (allConfirmedInTime) {
        await grantAchievementIfNeeded(volunteerId, 'perfect_month', 1);
      }
    }
  } catch (err) {
    console.error('[achievements] checkAchievementsOnTaskConfirmed error:', err);
  }
}

// Вызывается когда организатор создал первый проект
export async function checkAchievementsOnProjectCreated(organizerId: string) {
  try {
    const projectCount = await prisma.project.count({
      where: { organizerId },
    });

    if (projectCount >= 1) {
      await grantAchievementIfNeeded(organizerId, 'organizer', 1);
    }
  } catch (err) {
    console.error('[achievements] checkAchievementsOnProjectCreated error:', err);
  }
}
