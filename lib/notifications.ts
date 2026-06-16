import { prisma } from '@/lib/prisma';

type NotificationType = 'comment_reply' | 'new_project' | 'application_status' | 'project_overdue';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    return await prisma.notification.create({ data: params });
  } catch (error) {
    // Уведомления не должны ломать основной флоу
    console.error('Failed to create notification:', error);
    return null;
  }
}

/** Уведомить пользователей с интересом к категории о новом проекте */
export async function notifyNewProject(projectId: string, projectTitle: string, categoryId: string) {
  try {
    const interested = await prisma.interest.findMany({
      where: { categoryId },
      select: { userId: true },
    });

    if (interested.length === 0) return;

    await prisma.notification.createMany({
      data: interested.map(({ userId }) => ({
        userId,
        type: 'new_project' as NotificationType,
        title: 'Новый проект по вашим интересам',
        body: projectTitle,
        link: `/volunteer/projects/${projectId}`,
      })),
      skipDuplicates: true,
    });
  } catch (error) {
    console.error('Failed to notify new project:', error);
  }
}
