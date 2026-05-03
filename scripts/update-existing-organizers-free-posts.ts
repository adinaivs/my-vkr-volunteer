import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Обновление количества бесплатных публикаций для существующих организаторов...');

  // Получаем текущую настройку
  const setting = await prisma.setting.findUnique({
    where: { key: 'default_free_posts' },
  });

  const defaultFreePosts = setting ? parseInt(setting.value) : 3;
  console.log('Текущая настройка бесплатных публикаций:', defaultFreePosts);

  // Находим всех организаторов с дефолтным значением (3)
  const organizersToUpdate = await prisma.organizerProfile.findMany({
    where: {
      freePostsRemaining: 3,
    },
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  console.log(`Найдено организаторов для обновления: ${organizersToUpdate.length}`);

  if (organizersToUpdate.length === 0) {
    console.log('Нет организаторов для обновления');
    return;
  }

  // Обновляем каждого организатора
  for (const organizer of organizersToUpdate) {
    await prisma.organizerProfile.update({
      where: { userId: organizer.userId },
      data: {
        freePostsRemaining: defaultFreePosts,
      },
    });

    console.log(
      `✓ Обновлен: ${organizer.user.firstName} ${organizer.user.lastName} (${organizer.user.email}) - установлено ${defaultFreePosts} бесплатных публикаций`
    );
  }

  console.log('\nГотово! Все организаторы обновлены.');
}

main()
  .catch((e) => {
    console.error('Ошибка:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
